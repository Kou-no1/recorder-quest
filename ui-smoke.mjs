import assert from 'node:assert/strict';

const listeners = new Map();
const stored = new Map();
const generic = () => ({
  innerHTML: '',
  textContent: '',
  value: '',
  disabled: false,
  style: { setProperty() {} },
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
const scoreOutput = generic();
const scoreSurface = { ...generic(), scrollWidth: 1200, scrollHeight: 900 };
const scoreViewport = { ...generic(), clientWidth: 800, getBoundingClientRect: () => ({ top: 300 }) };
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
  querySelectorAll: () => [],
  addEventListener: (type, handler) => listeners.set(type, handler),
};
globalThis.window = {
  addEventListener() {},
  AudioContext: null,
  webkitAudioContext: null,
};

await import('./dist/app.js');
const click = listeners.get('click');
const change = listeners.get('change');
const fireClick = async dataset => click({ preventDefault() {}, target: { closest: () => ({ dataset }) } });

assert.match(app.innerHTML, /ぼうけんマップ/);
await fireClick({ page: 'songs' });
assert.equal((app.innerHTML.match(/class="song-level /g) || []).length, 9);
assert.equal((app.innerHTML.match(/class="song-item /g) || []).length, 5);
assert.match(app.innerHTML, /data-song-level="2" aria-pressed="false" aria-disabled="true"/);

await fireClick({ song: 'curriculum-05' });
for (const action of ['score-fit', 'score-out', 'score-in', 'score-reset']) assert.match(app.innerHTML, new RegExp(`data-action="${action}"`));
await fireClick({ action: 'score-fit' });
assert.equal(scoreOutput.value, '50%');
await fireClick({ action: 'score-reset' });
assert.equal(scoreOutput.value, '100%');
await fireClick({ action: 'score-out' });
assert.equal(scoreOutput.value, '90%');
await fireClick({ action: 'score-in' });
assert.equal(scoreOutput.value, '100%');

for (const id of ['curriculum-01', 'curriculum-02', 'curriculum-03']) {
  await fireClick({ song: id });
  await fireClick({ rateSong: '2' });
}
assert.match(app.innerHTML, /data-song-level="2" aria-pressed="false" aria-disabled="false"/);
assert.match(app.innerHTML, /✦ 30 <small>ポイント/);

await fireClick({ page: 'guide' });
await change({ target: { id: 'unlock-all', checked: true, matches: () => false } });
await fireClick({ page: 'songs' });
assert.match(app.innerHTML, /data-song-level="8" aria-pressed="false" aria-disabled="false"/);

console.log('PASS: UI render / 5-song lists / unlock flow / song points / score fit and manual zoom / teacher unlock');
