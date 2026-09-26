import assert from 'node:assert/strict';
import {CURRICULUM_SONGS,EXTRA_SONGS,TRACKABLE_SONGS} from './dist/song-library.js';
import {STORAGE_KEY,parseNotes,points} from './dist/core.js';
import {NOTES} from './dist/content.js';

const listeners = new Map();
const stored = new Map();
const generic = () => ({
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
const fixed = new Map([
  ['#app', app],
  ['#toast', generic()],
  ['#lesson-dialog', generic()],
  ['#confirm-dialog', generic()],
  ['#main', generic()],
  ['.score-viewport', scoreViewport],
  ['.score-zoom-surface', scoreSurface],
  ['#score-zoom-output', scoreOutput],
]);

globalThis.location = { hash: '' };
globalThis.innerHeight = 800;
globalThis.localStorage = {
  getItem: key => stored.get(key) ?? null,
  setItem: (key, value) => stored.set(key, value),
};
globalThis.requestAnimationFrame = callback => callback();
globalThis.setTimeout = () => 1;
globalThis.clearTimeout = () => {};
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
assert.equal((app.innerHTML.match(/class="song-level /g) || []).length, 10);
assert.equal((app.innerHTML.match(/class="song-item /g) || []).length, 5);
assert.match(app.innerHTML, /data-song-level="2" aria-pressed="false" aria-disabled="true"/);

await fireClick({ song: 'curriculum-05' });
for (const action of ['score-fit', 'score-out', 'score-in', 'score-reset']) assert.match(app.innerHTML, new RegExp(`data-action="${action}"`));
await fireClick({ action: 'score-fit' });
assert.equal(scoreOutput.value, '52%');
assert.ok(scoreSurface.scrollHeight * scoreSurface.style['--score-zoom'] <= 472);
assert.equal(scoreSurface.style.width, '780px');
await fireClick({ action: 'names' });
assert.match(app.innerHTML, /--score-zoom:0.524;width:780px/);
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
assert.ok(fitted < .25 && fitted*4000 <= 472);
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
assert.ok(scoreSurface.style['--score-zoom']*scoreSurface.scrollHeight<=472);
await fireClick({action:'score-reset'});
assert.equal(scoreOutput.value,'100%');
console.log('PASS: extra collection / six-step and full-score guards / stamps and history / points cap / saved progress / score zoom');
