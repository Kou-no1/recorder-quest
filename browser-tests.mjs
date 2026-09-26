// Optional real Chromium checks. Playwright is a test tool, not a site dependency.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, mkdir} from 'node:fs/promises';
import {resolve, extname} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {TRACKABLE_SONGS} from './dist/song-library.js';
import {STORAGE_KEY, points} from './dist/core.js';

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href : 'playwright');
const root=fileURLToPath(new URL('./dist/',import.meta.url));
const output=fileURLToPath(new URL('./.sites-runtime/browser-qa/',import.meta.url));
await mkdir(output,{recursive:true});
const server=createServer(async(req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
  const path=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!path.startsWith(root)){res.writeHead(403);res.end();return;}
  try{
    const body=await readFile(path);
    res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[extname(path)]||'application/octet-stream');
    res.end(body);
  }catch{res.writeHead(404);res.end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
let browser;
try{
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
  const page=await browser.newPage({viewport:{width:1366,height:768}});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  // Observe real Web Audio nodes and samples without replacing the audio engine.
  await page.addInitScript(()=>{
    window.audioAudit={events:[],contexts:[],analysers:[]};
    const Original=window.AudioContext;
    window.AudioContext=class extends Original{
      constructor(...args){super(...args);audioAudit.contexts.push(this);}
    };
    const connect=AudioNode.prototype.connect;
    AudioNode.prototype.connect=function(target,...args){
      const result=connect.call(this,target,...args);
      if(target instanceof AudioDestinationNode){
        const analyser=this.context.createAnalyser();
        connect.call(this,analyser);
        audioAudit.analysers.push(analyser);
      }
      return result;
    };
    const start=OscillatorNode.prototype.start,stop=OscillatorNode.prototype.stop;
    OscillatorNode.prototype.start=function(time){
      this.audit={frequency:this.frequency.value,time,ended:false,cancelled:false};
      audioAudit.events.push(this.audit);
      this.addEventListener('ended',()=>{this.audit.ended=true;});
      return start.call(this,time);
    };
    OscillatorNode.prototype.stop=function(time){
      if(this.audit){this.audit.stop=time;if(time===undefined)this.audit.cancelled=true;}
      return stop.call(this,time);
    };
  });
  const url=`http://127.0.0.1:${server.address().port}/`;
  const click=selector=>page.locator(selector).click();
  const route=pageName=>click(`[data-page="${pageName}"]`);
  const selectSong=async song=>{
    await click(`[data-song-level="${song.songLevel}"]`);
    await click(`[data-song="${song.id}"]`);
  };
  const fitted=()=>page.locator('.score-viewport').evaluate(el=>({
    width:el.clientWidth,height:el.clientHeight,scrollWidth:el.scrollWidth,scrollHeight:el.scrollHeight,
    scale:Number(document.querySelector('.score-zoom-surface').style.getPropertyValue('--score-zoom')),
    overflow:document.documentElement.scrollWidth>innerWidth
  }));
  const assertFit=async label=>{
    const r=await fitted();
    assert.ok(r.scrollWidth<=r.width+1&&r.scrollHeight<=r.height+1,`${label}: ${JSON.stringify(r)}`);
    assert.equal(r.overflow,false,label);
    assert.ok(r.scale>.01,`${label}: collapsed to minimum zoom`);
  };
  await page.goto(url+'#songs');
  assert.equal(await page.locator('.song-level').count(),10);
  assert.equal(await page.locator('[data-song-level="2"]').getAttribute('aria-disabled'),'true');
  await click('[data-song-level="-1"]');
  assert.equal(await page.locator('.song-item').count(),5);
  assert.equal(await page.locator('[data-rate-song="3"]').isDisabled(),true);
  for(const box of await page.locator('[data-song-step]').all())await box.check();
  await page.locator('#chunk-beats').selectOption('2');
  assert.equal(await page.locator('[data-rate-song="3"]').isDisabled(),true);
  await page.locator('#segment').selectOption('all');
  await click('[data-rate-song="3"]');
  await click('[data-rate-song="3"]');
  let saved=JSON.parse(await page.evaluate(key=>localStorage.getItem(key),STORAGE_KEY));
  assert.equal(points(saved),15);
  assert.equal(await page.locator('[data-song-level="2"]').getAttribute('aria-disabled'),'true');
  await page.reload();
  await route('stamps');
  await click('[data-history-song="curriculum-41"]');
  assert.equal(await page.locator('[data-song-step]:checked').count(),6);
  assert.equal(await page.locator('.song-detail h2').textContent(),'かたつむり');
  await route('guide');
  const downloadPromise=page.waitForEvent('download');
  await click('[data-action="export"]');
  const download=await downloadPromise;
  const backup=resolve(output,'backup.json');
  await download.saveAs(backup);
  assert.equal(points(JSON.parse(await readFile(backup,'utf8'))),15);
  await page.locator('#import-file').setInputFiles(backup);
  assert.equal(await page.locator('#confirm-dialog').isVisible(),true);
  await click('[data-action="confirm-import"]');
  saved=JSON.parse(await page.evaluate(key=>localStorage.getItem(key),STORAGE_KEY));
  assert.equal(points(saved),15);
  // A real UI import of a pre-song backup keeps its original lesson record.
  const legacy={version:1,records:{'w1-1':{rating:2,reflection:'旧記録',date:'2026-09-01T00:00:00Z'}}};
  await page.locator('#import-file').setInputFiles({name:'legacy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(legacy))});
  await click('[data-action="confirm-import"]');
  assert.equal(JSON.parse(await page.evaluate(key=>localStorage.getItem(key),STORAGE_KEY)).records['w1-1'].reflection,'旧記録');
  await page.locator('#unlock-all').check();
  await route('songs');
  await click('[data-song-level="1"]');
  await click('[data-song="curriculum-01"]');
  assert.equal(await page.locator('[data-rate-song]').count(),0);
  assert.match(await page.locator('.book-callout').textContent(),/準備中/);
  for(const viewport of [{width:1366,height:768},{width:1280,height:800}]){
    await page.setViewportSize(viewport);
    for(let level=1;level<=8;level++){
      await click(`[data-song-level="${level}"]`);
      assert.equal(await page.locator('.song-item').count(),5);
    }
    for(const song of TRACKABLE_SONGS.filter(s=>s.mode==='play')){
      await selectSong(song);
      assert.ok(await page.locator('.measure').count()>0,song.id);
      await click('[data-action="score-fit"]');
      await assertFit(`${viewport.width}/${song.id}`);
    }
    await click('[data-song-level="0"]');
    assert.equal(await page.locator('.song-item').count(),12);
    await selectSong(TRACKABLE_SONGS.find(s=>s.id==='curriculum-25'));
    await click('[data-action="score-fit"]');
    const before=(await fitted()).scale;
    await click('[data-action="score-out"]');
    assert.ok((await fitted()).scale<=before);
    await click('[data-action="score-reset"]');
    assert.equal((await fitted()).scale,1);
    await page.locator('#chunk-beats').focus();
    await page.locator('#chunk-beats').selectOption('2');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'chunk-beats');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'segment');
    await page.locator('.score-viewport').scrollIntoViewIfNeeded();
    await page.screenshot({path:resolve(output,`partial-${viewport.width}.png`)});
    await page.locator('#segment').selectOption('all');
    await click('[data-action="score-fit"]');
    await page.setViewportSize({width:viewport.width-40,height:viewport.height-30});
    await page.waitForTimeout(100);
    await assertFit('resize');
  }
  // 3/4 pickup: dotted eighth + sixteenth begin after 5 count-in beats.
  await selectSong(TRACKABLE_SONGS.find(s=>s.id==='curriculum-19'));
  await page.evaluate(()=>{audioAudit.events=[];});
  await click('[data-action="play"]');
  await page.waitForFunction(()=>audioAudit.events.length>5);
  const pickup=await page.evaluate(()=>audioAudit.events);
  const beat=60/72;
  assert.equal(pickup.filter(e=>e.frequency===1000).length,5);
  assert.ok(Math.abs(pickup[5].time-pickup[0].time-5*beat)<1e-8);
  assert.ok(Math.abs(pickup[6].time-pickup[5].time-.75*beat)<1e-8);
  assert.ok(Math.abs(pickup[7].time-pickup[6].time-.25*beat)<1e-8);
  assert.ok(pickup.some(e=>Math.abs(e.frequency-440*2**((78-69)/12))<.001));
  await click('[data-action="stop"]');
  // La Bamba starts with an eighth rest and sustains a tied note across a bar.
  await selectSong(TRACKABLE_SONGS.find(s=>s.id==='curriculum-21'));
  assert.ok(await page.locator('.tie').count()>0);
  await page.evaluate(()=>{audioAudit.events=[];});
  await click('[data-action="play"]');
  await page.waitForFunction(()=>audioAudit.events.length>4);
  const tied=await page.evaluate(()=>audioAudit.events);
  assert.ok(Math.abs(tied[4].time-tied[0].time-4.5*beat)<1e-8);
  assert.ok(Math.abs(tied[10].time-tied[9].time-beat)<1e-8);
  await click('[data-action="stop"]');
  await selectSong(TRACKABLE_SONGS.find(s=>s.id==='curriculum-31'));
  for(const part of ['1','2','both']){
    await page.locator('#duet-part').selectOption(part);
    await page.locator('#chunk-beats').selectOption('2');
    await page.locator('#segment').selectOption('2');
    await page.evaluate(()=>{audioAudit.events=[];});
    await click('[data-action="play"]');
    await page.waitForFunction(()=>audioAudit.events.length>4);
    const events=await page.evaluate(()=>audioAudit.events.filter(e=>e.frequency!==1000));
    assert.equal(events.length,part==='both'?3:part==='1'?2:1);
    if(part==='both')assert.equal(events[0].time,events[1].time);
    await click('[data-action="stop"]');
    assert.ok(await page.evaluate(()=>audioAudit.events.every(e=>e.cancelled||e.ended)));
  }
  // Real engine output: non-zero samples, without claiming speaker listening.
  await page.locator('.score-note[data-note]:not([data-note="R"])').first().focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(()=>audioAudit.analysers.some(a=>{const data=new Float32Array(a.fftSize);a.getFloatTimeDomainData(data);return data.some(n=>Math.abs(n)>.001);}));
  assert.ok(await page.evaluate(()=>audioAudit.contexts.some(c=>c.state==='running')));
  await click('[data-action="stop"]');
  await page.locator('#segment').selectOption('all');
  await click('[data-action="score-fit"]');
  await assertFit('duet');
  await page.locator('.score-viewport').scrollIntoViewIfNeeded();
  await page.screenshot({path:resolve(output,'duet.png')});
  assert.deepEqual(errors,[]);
  console.log('PASS: Chromium 1366x768 / 1280x800, 26 scores, 8 levels, seasonal/free tabs, fit/resize/reset, keyboard focus, stamps/points, reload, backup/legacy import, duet/partial/stop, real Web Audio samples, no console errors');
  console.log(`Screenshots: ${output}`);
}finally{
  await browser?.close();
  server.close();
}
