import assert from 'node:assert/strict';
import {CURRICULUM_SONGS,EXTRA_SONGS,TRACKABLE_SONGS} from './dist/song-library.js';
import {STORAGE_KEY,parseNotes,points} from './dist/core.js';
import {NOTES} from './dist/content.js';
import {buildPracticePlan,practicePages} from './dist/practice-session.js';
import {sliceBeats} from './dist/score-utils.js';

const listeners = new Map();
const stored = new Map();
const generic = () => ({
  dataset: {},
  innerHTML: '',
  textContent: '',
  value: '',
  disabled: false,
  style: { setProperty(key, value) { this[key] = value; } },
  classList: { add() {}, remove() {}, toggle() {} },
  addEventListener() {},
  focus() {},
  scrollIntoView() {},
  close() {},
  showModal() {},
  querySelector() { return generic(); },
  querySelectorAll() { return []; },
});

const app = generic();
const liveFingering = generic();
const scoreOutput = generic();
const scoreSurface = { ...generic(), scrollWidth: 1200, scrollHeight: 900 };
const scoreViewport = { ...generic(), clientWidth: 800, clientHeight: 500, getBoundingClientRect: () => ({ top: 300 }) };
const practiceScore = generic(), practicePhase = generic(), practicePageLabel = generic();
const practicePrev = generic(), practiceNext = generic(), practiceHint = generic();
const fixed = new Map([
  ['#app', app],
  ['#toast', generic()],
  ['#lesson-dialog', generic()],
  ['#confirm-dialog', generic()],
  ['#main', generic()],
  ['.score-viewport', scoreViewport],
  ['.score-zoom-surface', scoreSurface],
  ['#score-zoom-output', scoreOutput],
  ['#practice-score', practiceScore],
  ['#practice-phase', practicePhase],
  ['#practice-page-label', practicePageLabel],
  ['#practice-finger-hint', practiceHint],
  ['[data-action="practice-prev"]', practicePrev],
  ['[data-action="practice-next"]', practiceNext],
]);

globalThis.location = { hash: '' };
globalThis.innerHeight = 800;
globalThis.localStorage = {
  getItem: key => stored.get(key) ?? null,
  setItem: (key, value) => stored.set(key, value),
};
globalThis.requestAnimationFrame = callback => callback();
let timerId = 0, fakeNow = 0, mockAudio;
const scheduledTimers = new Map();
globalThis.setTimeout = (callback, delay=0) => {
  const id=++timerId;
  scheduledTimers.set(id,{callback,time:fakeNow+delay});
  return id;
};
globalThis.clearTimeout = id => scheduledTimers.delete(id);
function advanceTimers(duration){
  const end=fakeNow+duration;
  let callbacks=0;
  while(true){
    const due=[...scheduledTimers.entries()].filter(([,timer])=>timer.time<=end).sort((a,b)=>a[1].time-b[1].time||a[0]-b[0])[0];
    if(!due)break;
    assert.ok(++callbacks<5000,'timer callbacks must finish');
    const [id,timer]=due;
    scheduledTimers.delete(id);fakeNow=timer.time;
    if(mockAudio)mockAudio.currentTime=fakeNow/1000;
    timer.callback();
  }
  fakeNow=end;
  if(mockAudio)mockAudio.currentTime=fakeNow/1000;
}
globalThis.document = {
  hidden: false,
  modelContext: null,
  querySelector: selector => fixed.get(selector) ?? generic(),
  querySelectorAll: selector => selector === '.live-fingering' ? [liveFingering] : [],
  addEventListener: (type, handler) => listeners.set(type, handler),
};
// Exercise scheduling without a browser or an audio device.
const oscillators = [];
class MockAudioContext {
  constructor(){mockAudio=this;}
  currentTime = 0;
  state = 'running';
  destination = {};
  createOscillator() {
    const oscillator = { frequency: { value: 0 }, connect() {}, disconnect() {},
      start(time) { this.startTime = time; },
      stop(time) { if (time === undefined) this.cancelled = true; else this.endTime = time; } };
    oscillators.push(oscillator);
    return oscillator;
  }
  createGain() {
    return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {}, disconnect() {} };
  }
}
globalThis.window = {
  addEventListener() {},
  AudioContext: MockAudioContext,
  webkitAudioContext: null,
};

await import('./dist/app.js');
const click = listeners.get('click');
const change = listeners.get('change');
const fireClick = async dataset => click({ preventDefault() {}, target: { closest: () => ({ dataset }) } });
const fireChange = async (id, value) => change({ target: { id, value, matches: () => false } });
const saved = () => JSON.parse(stored.get(STORAGE_KEY));

assert.match(app.innerHTML, /ぼうけんマップ/);
await fireClick({ page: 'songs' });
assert.equal((app.innerHTML.match(/class="song-item /g) || []).length, 18);
assert.doesNotMatch(app.innerHTML, /この曲の楽譜は準備中/);
await fireClick({ songBrowse: 'levels' });
assert.equal((app.innerHTML.match(/class="song-level /g) || []).length, 10);
assert.equal((app.innerHTML.match(/class="song-item /g) || []).length, 5);
assert.match(app.innerHTML, /data-song-level="2" aria-pressed="false" aria-disabled="true"/);

await fireClick({ song: 'curriculum-05' });
for (const action of ['score-fit', 'score-out', 'score-in', 'score-reset']) assert.match(app.innerHTML, new RegExp(`data-action="${action}"`));
await fireClick({ action: 'score-fit' });
assert.equal(scoreOutput.value, '53%');
assert.ok(scoreSurface.scrollHeight * scoreSurface.style['--score-zoom'] <= 480);
assert.equal(scoreSurface.style.width, '780px');
await fireClick({ action: 'names' });
assert.match(app.innerHTML, /--score-zoom:0.533;width:780px/);
await fireClick({ action: 'score-reset' });
assert.equal(scoreOutput.value, '100%');
await fireClick({ action: 'score-out' });
assert.equal(scoreOutput.value, '90%');
await fireClick({ action: 'score-in' });
assert.equal(scoreOutput.value, '100%');

// A partial exercise or unchecked steps must not unlock the next level.
await fireClick({ rateSong: '2' });
assert.match(app.innerHTML, /✦ 0 <small>ポイント/);
for (let i=0; i<6; i++) await change({ target: { dataset: { songStep: String(i) }, checked: true } });
assert.deepEqual(saved().songSteps['curriculum-05'], Array(6).fill(true));
await fireChange('chunk-beats', '2');
await fireClick({ rateSong: '2' });
assert.equal(saved().songRecords['curriculum-05'], undefined);
await fireChange('segment', 'all');
await fireClick({ rateSong: '2' });
assert.match(app.innerHTML, /data-song-level="2" aria-pressed="false" aria-disabled="false"/);
assert.match(app.innerHTML, /✦ 10 <small>ポイント/);
await fireClick({ rateSong: '2' });
assert.match(app.innerHTML, /✦ 10 <small>ポイント/);
await fireClick({ action: 'names' });
assert.equal((app.innerHTML.match(/data-song-step="\d" checked/g) || []).length, 6);

await fireClick({ song: 'curriculum-01' });
assert.match(app.innerHTML, /この曲の楽譜は準備中/);
assert.doesNotMatch(app.innerHTML, /data-rate-song=|class="score-grid"/);
await fireClick({ rateSong: '2' });
assert.equal(saved().songRecords['curriculum-01'], undefined);
await fireClick({ action: 'ready-song' });
assert.match(app.innerHTML, /data-song="curriculum-05" aria-pressed="true"/);

await fireClick({ page: 'stamps' });
assert.match(app.innerHTML, /data-history-song="curriculum-05"/);
await fireClick({ historySong: 'curriculum-05' });
assert.match(app.innerHTML, /data-song-step="0" checked/);

await fireClick({ page: 'guide' });
await change({ target: { id: 'unlock-all', checked: true, matches: () => false } });
await fireClick({ page: 'songs' });
assert.match(app.innerHTML, /data-song-level="8" aria-pressed="false" aria-disabled="false"/);

for (const song of TRACKABLE_SONGS.filter(s=>s.mode==='play')) {
  await fireClick({ songLevel: String(song.songLevel) });
  await fireClick({ song: song.id });
  assert.ok(app.innerHTML.includes(song.scope), song.id);
  assert.match(app.innerHTML, /class="score-grid"/);
  assert.doesNotMatch(app.innerHTML, /NaN|undefined/);
  assert.equal((app.innerHTML.match(/data-song-step="\d"/g)||[]).length, 6);
  const chunkOptions = app.innerHTML.match(/id="chunk-beats">(.*?)<\/select>/)[1];
  assert.equal((chunkOptions.match(/selected/g)||[]).length, 1);
}

await fireClick({ songLevel: '4' });
await fireClick({ song: 'curriculum-19' });
assert.match(app.innerHTML, /aria-label="弱起"/);
assert.match(app.innerHTML, /class="accidental">♯/);
await fireClick({ note: 'F#5' });
assert.doesNotMatch(liveFingering.innerHTML, /この機種の指の形は確認中/);
assert.match(liveFingering.innerHTML, /class="hole-list"/);
oscillators.length = 0;
await fireClick({ action: 'play' });
await Promise.resolve();
const melody = parseNotes(CURRICULUM_SONGS.find(s=>s.id==='curriculum-19').notes);
const scheduled = oscillators.filter(o=>o.frequency.value!==1000);
assert.equal(oscillators.filter(o=>o.frequency.value===1000).length, 5);
assert.equal(scheduled.length, melody.length);
let beatOffset = 5;
for (let i=0; i<scheduled.length; i++) {
  assert.ok(Math.abs(scheduled[i].startTime - (.1 + beatOffset * 60 / 72)) < 1e-9);
  assert.ok(Math.abs(scheduled[i].frequency.value - 440*2**((NOTES[melody[i].note][1]-69)/12)) < 1e-9);
  beatOffset += melody[i].beats;
}
await fireClick({ action: 'stop' });
assert.ok(scheduled.every(o=>o.cancelled));
await fireChange('chunk-beats', '2');
await fireChange('segment', '1');
oscillators.length=0;
await fireClick({ action: 'play' });
await Promise.resolve();
assert.equal(oscillators.filter(o=>o.frequency.value===1000).length, 4);
await fireClick({ action: 'stop' });

// A very tall score may fit below 25%; pressing minus must never enlarge it.
scoreSurface.scrollHeight = 4000;
await fireClick({ action: 'score-fit' });
const fitted = scoreSurface.style['--score-zoom'];
assert.ok(fitted < .25 && fitted*4000 <= 480);
await fireClick({ action: 'score-out' });
assert.ok(scoreSurface.style['--score-zoom'] <= fitted);
await fireClick({ action: 'score-in' });
assert.ok(scoreSurface.style['--score-zoom'] > fitted);

await fireClick({ page: 'guide' });
await change({ target: { id: 'unlock-all', checked: false, matches: () => false } });
await fireClick({ page: 'songs' });
assert.match(app.innerHTML, /data-song-level="1" aria-pressed="true"/);

console.log('PASS: simulated DOM: 26 scores / steps and persistence / partial-score rating guard / unlock and points / fit and manual zoom / pickup audio scheduling and stop');
await fireClick({page:'guide'});await change({target:{id:'unlock-all',checked:true,matches:()=>false}});await fireClick({page:'songs'});
await fireClick({songLevel:'7'});await fireClick({song:'curriculum-31'});
await fireChange('duet-part','2');assert.match(app.innerHTML,/第2パート：長い音の伴奏/);
await fireChange('duet-part','both');assert.equal((app.innerHTML.match(/class="score-grid"/g)||[]).length,2);
oscillators.length=0;await fireClick({action:'play'});await Promise.resolve();
const duet=CURRICULUM_SONGS.find(s=>s.id==='curriculum-31');
assert.equal(oscillators.filter(o=>o.frequency.value!==1000).length,parseNotes(duet.notes).length+parseNotes(duet.secondVoice).length);
assert.equal(oscillators.filter(o=>o.frequency.value!==1000&&Math.abs(o.startTime-(.1+4*60/72))<1e-9).length,2);
await fireClick({action:'stop'});await fireChange('chunk-beats','2');await fireChange('segment','1');
oscillators.length=0;await fireClick({action:'play'});await Promise.resolve();assert.equal(oscillators.filter(o=>o.frequency.value!==1000).length,3);await fireClick({action:'stop'});
await fireClick({songLevel:'6'});await fireClick({song:'curriculum-29'});assert.match(app.innerHTML,/class="accidental">♭/);assert.match(app.innerHTML,/レ♭/);
await fireClick({page:'fingers'});await fireClick({pickNote:'C#5'});assert.match(liveFingering.innerHTML,/小穴の大きい方だけ閉じる/);
await fireClick({pickNote:'C#7'});assert.match(liveFingering.innerHTML,/資料により裏穴/);
console.log('PASS: duet selection / two-voice scheduling / partial duet / flats / paired holes / high-note caveat');

// Extra songs remain available with progression enabled and persist like scored songs.
await fireClick({page:'guide'});
await change({target:{id:'unlock-all',checked:false,matches:()=>false}});
await fireClick({page:'songs'});
await fireClick({songLevel:'-1'});
assert.equal((app.innerHTML.match(/class="song-item /g)||[]).length,5);
for(const song of EXTRA_SONGS) assert.ok(app.innerHTML.includes(song.title));
assert.match(app.innerHTML,/data-song-level="-1" aria-pressed="true"/);
assert.doesNotMatch(app.innerHTML,/LEVEL -1|NaN|undefined/);
const beforeExtra=points(saved());
const beforeLessons=JSON.stringify(saved().records);
await fireClick({rateSong:'2'});
assert.equal(saved().songRecords['curriculum-41'],undefined);
for(let i=0;i<6;i++) await change({target:{dataset:{songStep:String(i)},checked:true}});
await fireChange('chunk-beats','2');
await fireClick({rateSong:'2'});
assert.equal(saved().songRecords['curriculum-41'],undefined);
await fireChange('segment','all');
await fireClick({rateSong:'2'});
assert.equal(points(saved()),beforeExtra+10);
await fireClick({rateSong:'3'});
await fireClick({rateSong:'3'});
assert.equal(points(saved()),beforeExtra+15);
assert.equal(JSON.stringify(saved().records),beforeLessons);
assert.deepEqual(saved().songSteps['curriculum-41'],Array(6).fill(true));
await fireClick({page:'stamps'});
assert.match(app.innerHTML,/data-history-song="curriculum-41">かたつむり/);
await fireClick({historySong:'curriculum-41'});
assert.match(app.innerHTML,/data-song-level="-1" aria-pressed="true"/);
assert.match(app.innerHTML,/data-song-step="0" checked/);
await fireClick({action:'score-fit'});
assert.ok(scoreSurface.style['--score-zoom']*scoreSurface.scrollHeight<=480);
await fireClick({action:'score-reset'});
assert.equal(scoreOutput.value,'100%');
console.log('PASS: extra collection / six-step and full-score guards / stamps and history / points cap / saved progress / score zoom');

// Exercise focused practice through the same delegated events as the browser.
// Earlier toast timers are unrelated to playback and can be discarded here.
scheduledTimers.clear();
await fireClick({song:'curriculum-05'});
await fireClick({action:'practice-open'});
assert.match(app.innerHTML,/class="practice-screen\b/);
assert.match(app.innerHTML,/1〜2小節（1\/2）/);
assert.match(app.innerHTML,/data-practice-mode="echo" aria-pressed="true"/);
await fireClick({action:'practice-next'});
assert.equal(practicePageLabel.textContent,'3〜4小節（2/2）');
assert.equal(practiceNext.disabled,true);
assert.equal(practicePrev.disabled,false);
assert.match(practiceScore.innerHTML,/この範囲の最後/);
await fireClick({action:'practice-next'});
assert.equal(practicePageLabel.textContent,'3〜4小節（2/2）','next is clamped at the final page');
await fireClick({action:'practice-prev'});
await fireClick({action:'practice-prev'});
assert.equal(practicePageLabel.textContent,'1〜2小節（1/2）');
assert.equal(practicePrev.disabled,true);
assert.equal(practiceNext.disabled,false);

await fireChange('practice-span','selection');
await fireChange('practice-repeats','3');
assert.match(app.innerHTML,/<option value="selection" selected>/);
assert.match(app.innerHTML,/<option value="3" selected>3回/);
const focusSong=CURRICULUM_SONGS.find(s=>s.id==='curriculum-05');
const focusEvents=parseNotes(focusSong.notes),focusBeat=60/72;
const echoPlan=buildPracticePlan(focusEvents,4,0,3);
oscillators.length=0;
const echoEpoch=fakeNow;
await fireClick({action:'play'});await Promise.resolve();
const echoMelody=oscillators.filter(o=>o.frequency.value!==1000);
assert.equal(echoMelody.length,focusEvents.length*3);
assert.equal(oscillators.filter(o=>o.frequency.value===1000).length,24,'each of six turns receives a four-beat count-in');
for(const phase of echoPlan.phases.filter(p=>p.type==='student')){
  const first=echoEpoch/1000+.1+phase.startBeat*focusBeat,last=echoEpoch/1000+.1+phase.endBeat*focusBeat;
  assert.ok(echoMelody.every(o=>o.startTime<first||o.startTime>=last),'student turn contains no scheduled melody');
}
const firstModel=echoPlan.phases.find(p=>p.type==='model');
advanceTimers(100+firstModel.startBeat*focusBeat*1000+1);
assert.equal(practicePhase.dataset.phase,'model');
const firstStudent=echoPlan.phases.find(p=>p.type==='student');
advanceTimers(echoEpoch+100+firstStudent.startBeat*focusBeat*1000+1-fakeNow);
assert.equal(practicePhase.dataset.phase,'student');
assert.equal(practicePhase.textContent,'自分で吹こう');
assert.match(practiceHint.textContent,/次は|最後の音/);
advanceTimers(8*focusBeat*1000);
assert.equal(practicePageLabel.textContent,'3〜4小節（2/2）','score follows the student turn as well as the model');
await fireClick({action:'stop'});
assert.ok(oscillators.every(o=>o.cancelled),'stop cancels model notes and count-in nodes');
assert.equal(scheduledTimers.size,0,'stop clears every scheduled playback update');
const stoppedPage=practicePageLabel.textContent;
advanceTimers(echoPlan.totalBeats*focusBeat*1000);
assert.equal(practicePageLabel.textContent,stoppedPage);
assert.equal(practicePhase.dataset.phase,'ready','cancelled callbacks cannot restart the exercise');

// Model mode plays once regardless of the saved echo repeat count.
await fireClick({practiceMode:'model'});
assert.match(app.innerHTML,/data-practice-mode="model" aria-pressed="true"/);
oscillators.length=0;
await fireClick({action:'play'});await Promise.resolve();
assert.equal(oscillators.filter(o=>o.frequency.value!==1000).length,focusEvents.length);
assert.equal(oscillators.filter(o=>o.frequency.value===1000).length,4);
advanceTimers(100+(4+16)*focusBeat*1000+1);
assert.equal(practicePhase.dataset.phase,'reflection');
assert.ok(oscillators.every(o=>o.cancelled));

// Page-only practice uses the displayed second page, rather than restarting
// the full song, and leaving the focused screen cancels it.
await fireChange('practice-span','page');
await fireChange('practice-repeats','2');
await fireClick({practiceMode:'echo'});
await fireClick({action:'practice-next'});
const secondPage=practicePages(focusEvents,4,0)[1];
const pageEvents=sliceBeats(focusEvents,secondPage.startBeat,secondPage.endBeat-secondPage.startBeat);
oscillators.length=0;
await fireClick({action:'play'});await Promise.resolve();
assert.equal(oscillators.filter(o=>o.frequency.value!==1000).length,pageEvents.length*2);
assert.equal(oscillators.filter(o=>o.frequency.value===1000).length,16);
await fireClick({action:'stop'});
await change({target:{id:'click-track',checked:true,matches:()=>false}});
oscillators.length=0;
const clickEpoch=fakeNow;
await fireClick({action:'play'});await Promise.resolve();
assert.equal(oscillators.filter(o=>o.frequency.value!==1000).length,pageEvents.length*2);
assert.equal(oscillators.filter(o=>o.frequency.value===1000).length,48,'optional beat clicks continue through model and student phrases');
const pageStudent=buildPracticePlan(pageEvents,4,0,2).phases.find(p=>p.type==='student');
assert.ok(oscillators.some(o=>o.frequency.value===1000&&Math.abs(o.startTime-(clickEpoch/1000+.1+pageStudent.startBeat*focusBeat))<1e-9),'student turn can receive beat clicks without melody');
await fireClick({action:'practice-close'});
assert.doesNotMatch(app.innerHTML,/class="practice-screen\b/);
assert.ok(oscillators.every(o=>o.cancelled));
assert.equal(scheduledTimers.size,0);
assert.deepEqual(saved().songSteps['curriculum-05'],Array(6).fill(true),'focused practice preserves existing progress');
await change({target:{id:'click-track',checked:false,matches:()=>false}});

// Two voices share each model turn; neither is scheduled during a student turn.
await fireClick({page:'guide'});
await change({target:{id:'unlock-all',checked:true,matches:()=>false}});
await fireClick({page:'songs'});
await fireClick({songLevel:'7'});await fireClick({song:'curriculum-31'});
await fireChange('duet-part','both');
await fireClick({action:'practice-open'});
await fireChange('practice-span','selection');
await fireChange('practice-repeats','1');
scheduledTimers.clear();oscillators.length=0;
const duetEpoch=fakeNow;
await fireClick({action:'play'});await Promise.resolve();
const focusedDuetNotes=oscillators.filter(o=>o.frequency.value!==1000);
assert.equal(focusedDuetNotes.length,parseNotes(duet.notes).length+parseNotes(duet.secondVoice).length);
assert.equal(focusedDuetNotes.filter(o=>Math.abs(o.startTime-(duetEpoch/1000+.1+4*focusBeat))<1e-9).length,2);
const duetStudent=buildPracticePlan(parseNotes(duet.notes),4,0,1).phases.find(p=>p.type==='student');
assert.ok(focusedDuetNotes.every(o=>o.startTime<duetEpoch/1000+.1+duetStudent.startBeat*focusBeat));
await fireClick({page:'map'});
assert.ok(oscillators.every(o=>o.cancelled),'navigation cancels both duet parts');
assert.equal(scheduledTimers.size,0);
assert.doesNotMatch(app.innerHTML,/class="practice-screen\b/);
console.log('PASS: focused practice / page boundaries and following / model and student turns / repeat and span settings / silent student melody / duet scheduling / stop and navigation cancellation');
