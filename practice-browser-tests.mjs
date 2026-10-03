// Optional real Chromium checks; Playwright is not a dependency of the site.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {TRACKABLE_SONGS} from './dist/song-library.js';
import {SONGS,NOTES} from './dist/content.js';
import {parseNotes} from './dist/core.js';

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
  try{res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[extname(path)]||'application/octet-stream');res.end(await readFile(path));}
  catch{res.writeHead(404);res.end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
let browser;
try{
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
  const page=await browser.newPage({viewport:{width:1366,height:768}});
  page.setDefaultTimeout(15000);
  const errors=[];
  const layoutIssues=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.addInitScript(()=>{
    window.audioAudit={events:[]};
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
  const click=selector=>page.locator(selector).click();
  const startPlayback=async()=>{await click('[data-action="stop"]');await click('[data-action="play"]');};
  const resetAudit=()=>page.evaluate(()=>{audioAudit.events=[];});
  const phase=value=>page.waitForFunction(value=>document.querySelector('#practice-phase')?.dataset.phase===value,value,{timeout:18000});
  const selectSong=async id=>{
    if(await page.locator('[data-action="practice-close"]').count())await click('[data-action="practice-close"]');
    await page.locator('#song-filter').selectOption('all');
    await click(`[data-song="${id}"]`);
  };
  const tempo=()=>page.locator('#tempo').evaluate(input=>{input.value='140';input.dispatchEvent(new Event('input',{bubbles:true}));});
  const songMap=new Map([...TRACKABLE_SONGS,...SONGS].map(song=>[song.id,song]));
  await page.goto(`http://127.0.0.1:${server.address().port}/#songs`);
  assert.equal(await page.locator('.song-item').count(),18);
  assert.equal(await page.locator('[data-song-browse="ready"]').getAttribute('aria-pressed'),'true');
  for(const filter of ['basic','short','high']){
    await page.locator('#song-filter').selectOption(filter);
    const ids=await page.locator('[data-song]').evaluateAll(items=>items.map(item=>item.dataset.song));
    assert.ok(ids.length>0,filter);
    for(const id of ids){
      const song=songMap.get(id),voices=[parseNotes(song.notes),...(song.secondVoice?[parseNotes(song.secondVoice)]:[])];
      const pitches=voices.flat().filter(event=>event.note!=='R').map(event=>NOTES[event.note][1]);
      assert.notEqual(song.mode,'book');
      if(filter==='basic')assert.ok(pitches.every(pitch=>[79,81,83].includes(pitch)),id);
      if(filter==='high')assert.ok(pitches.some(pitch=>pitch>=84),id);
      if(filter==='short')assert.ok(voices.every(events=>events.reduce((sum,event)=>sum+event.beats,0)<=32),id);
    }
  }
  await click('[data-page="guide"]');
  await page.locator('#unlock-all').check();
  await click('[data-page="songs"]');
  await page.locator('#song-filter').selectOption('all');
  assert.equal(await page.locator('.song-item').count(),38);
  console.log('PASS: playable catalogue, filters and teacher unlock');
  await selectSong('curriculum-05');
  await click('[data-action="practice-open"]');
  for(const viewport of [{width:1366,height:768},{width:1280,height:800}]){
    await page.setViewportSize(viewport);
    const geometry=await page.evaluate(()=>{
      const measures=[...document.querySelectorAll('#practice-score .measure')].map(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}));
      const controls=document.querySelector('.practice-controls').getBoundingClientRect();
      const head=document.querySelector('#practice-score .note-head')?.getBoundingClientRect();
      const details=Object.fromEntries(['.practice-header','.practice-settings','.practice-state','.practice-layout','.practice-fingers','.fingering','.hole-row','.finger-legend','.finger-tip'].map(selector=>{
        const el=document.querySelector(selector),r=el.getBoundingClientRect();return [selector,{top:r.top,bottom:r.bottom,height:r.height}];
      }));
      return {overflow:document.documentElement.scrollWidth>innerWidth,measures,controls:{top:controls.top,bottom:controls.bottom},noteWidth:head?.width,details};
    });
    assert.equal(geometry.overflow,false,JSON.stringify(geometry));
    assert.equal(geometry.measures.length,2);
    assert.ok(geometry.measures.every(measure=>measure.width>=300&&measure.height>=210),JSON.stringify(geometry));
    assert.ok(geometry.noteWidth>=12,'note heads are readable without shrinking the entire score');
    if(geometry.controls.top<0||geometry.controls.bottom>viewport.height)layoutIssues.push({viewport,...geometry});
    await page.screenshot({path:resolve(output,`practice-${viewport.width}.png`)});
    if(layoutIssues.length)console.log(`Layout geometry: ${JSON.stringify(geometry)}`);
  }
  // Schedule two rounds. The student interval has count-in clicks, but no melody.
  await click('[data-action="practice-close"]');
  await page.locator('#chunk-beats').selectOption('2');
  await click('[data-action="practice-open"]');
  await tempo();
  await page.locator('#practice-repeats').selectOption('2');
  await resetAudit();
  await startPlayback();
  await page.waitForFunction(()=>audioAudit.events.length>8);
  const echo=await page.evaluate(()=>audioAudit.events);
  const beat=60/140,start=echo[0].time;
  assert.equal(echo.filter(event=>event.frequency===1000).length,16);
  const melody=echo.filter(event=>event.frequency!==1000);
  assert.equal(melody.length,4,'two source notes sound once per model round');
  assert.ok(melody.every(event=>{
    const at=(event.time-start)/beat;
    return (at>=4-1e-8&&at<6)||(at>=16-1e-8&&at<18);
  }),'student turns contain no sounding melody');
  await phase('student');
  assert.match(await page.locator('.player-status').textContent(),/自分の音で吹こう/);
  await click('[data-action="stop"]');
  const stopped=await page.locator('.player-status').textContent();
  await page.waitForTimeout(1150);
  assert.equal(await page.locator('#practice-phase').getAttribute('data-phase'),'ready');
  assert.equal(await page.locator('.player-status').textContent(),stopped,'stopped timers do not change phase/status');
  assert.ok(await page.evaluate(()=>audioAudit.events.every(event=>event.cancelled||event.ended)));
  assert.equal(await page.locator('.score-note.sounding').count(),0);
  console.log('PASS: actual student turn, silent melody and stop cancellation');

  // In full-range playback, each count-in returns to the first page and musical
  // time changes the page at the next pair of bars, independent of note onset.
  await click('[data-action="practice-close"]');
  await page.locator('#segment').selectOption('all');
  await click('[data-action="practice-open"]');
  await page.locator('#practice-repeats').selectOption('1');
  await page.locator('#practice-span').selectOption('selection');
  await click('[data-action="practice-next"]');
  assert.match(await page.locator('#practice-page-label').textContent(),/3〜4小節/);
  await startPlayback();
  await phase('count-in');
  assert.equal(await page.locator('#practice-score').getAttribute('data-practice-page'),'0');
  await page.waitForFunction(()=>document.querySelector('#practice-score')?.dataset.practicePage==='1',null,{timeout:10000});
  assert.equal(await page.locator('#practice-phase').getAttribute('data-phase'),'model');
  await page.waitForFunction(()=>document.querySelector('#practice-phase')?.dataset.phase==='count-in'&&document.querySelector('.player-status')?.textContent.includes('自分の番'),null,{timeout:10000});
  assert.equal(await page.locator('#practice-score').getAttribute('data-practice-page'),'0');
  await click('[data-action="stop"]');
  console.log('PASS: automatic page following and count-in page reset');

  await selectSong('curriculum-19');
  await click('[data-action="practice-open"]');
  assert.match(await page.locator('#practice-page-label').textContent(),/^弱起〜1小節/);
  await click('[data-action="practice-next"]');
  assert.match(await page.locator('#practice-page-label').textContent(),/^2〜3小節/);
  await selectSong('curriculum-21');
  await click('[data-action="practice-open"]');
  assert.ok(await page.locator('#practice-score .tie').count()>0,'ties render in the focused page');

  await selectSong('curriculum-31');
  await page.locator('#duet-part').selectOption('both');
  await click('[data-action="practice-open"]');
  assert.equal(await page.locator('#practice-score .score-grid').count(),2);
  assert.equal(await page.locator('#practice-score .measure').count(),4);
  assert.ok(await page.locator('[data-secondary-event]').count()>0);
  const duetBottom=await page.locator('.practice-controls').evaluate(el=>el.getBoundingClientRect().bottom);
  if(duetBottom>800)layoutIssues.push({duetControlsBottom:duetBottom});
  await page.screenshot({path:resolve(output,'practice-duet-1280.png')});
  await click('[data-action="practice-close"]');
  await page.locator('#chunk-beats').selectOption('2');
  await click('[data-action="practice-open"]');
  await page.locator('#practice-repeats').selectOption('1');
  await resetAudit();
  await startPlayback();
  await page.waitForFunction(()=>audioAudit.events.length>8);
  const duet=await page.evaluate(()=>audioAudit.events.filter(event=>event.frequency!==1000));
  assert.equal(duet.length,3,'the model contains both parts; the student interval contains neither');
  assert.equal(duet[0].time,duet[2].time,'melody and accompaniment start together');
  await click('[data-action="stop"]');
  assert.deepEqual(errors,[]);
  assert.deepEqual(layoutIssues,[],'practice controls must fit in the school-device viewport');
  console.log('PASS: Chromium playable catalogue/filters/unlock, readable 1366x768 and 1280x800 focus, actual student turn, silent student melody, stop cancellation, page following/reset, pickups/ties and duet BOTH');
  console.log(`Screenshots: ${output}`);
}finally{
  await browser?.close();
  server.close();
}
