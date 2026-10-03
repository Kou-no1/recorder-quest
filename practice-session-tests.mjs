import assert from 'node:assert/strict';
import { buildPracticePlan, practicePages, practicePageAtBeat } from './dist/practice-session.js';

const events = [{ note: 'C5', beats: .75 }, { note: 'R', beats: .25 }, { note: 'D5', beats: 2 }, { note: 'E5', beats: 3 }];
const snapshot = structuredClone(events);
const plan = buildPracticePlan(events, 3, 1, 2);
assert.equal(plan.countInBeats, 5);
assert.equal(plan.phraseBeats, 6);
assert.equal(plan.totalBeats, 44);
assert.deepEqual(plan.phases.map(phase => [phase.type, phase.round, phase.startBeat, phase.endBeat]), [
  ['count-in', 1, 0, 5], ['model', 1, 5, 11], ['count-in', 1, 11, 16], ['student', 1, 16, 22],
  ['count-in', 2, 22, 27], ['model', 2, 27, 33], ['count-in', 2, 33, 38], ['student', 2, 38, 44],
]);
for (const phase of plan.phases.filter(phase => phase.type !== 'count-in')) {
  assert.deepEqual(phase.events.map(event => [event.note, event.beats, event.index, event.offsetBeat]), [
    ['C5', .75, 0, 0], ['R', .25, 1, .75], ['D5', 2, 2, 1], ['E5', 3, 3, 3],
  ]);
  assert.equal(phase.events[0].startBeat, phase.startBeat);
  assert.equal(phase.events.at(-1).endBeat, phase.endBeat);
}
assert.deepEqual(events, snapshot, 'plan and pages must not mutate source notes');
assert.equal(buildPracticePlan(events, 2).countInBeats, 2);
assert.equal(buildPracticePlan(events, 2, 1).countInBeats, 3);
assert.equal(buildPracticePlan(events, 4, 2).countInBeats, 6);
for (const [input, expected] of [[0, 1], [-2, 1], [2.9, 2], [4, 3], [NaN, 1]]) {
  assert.equal(buildPracticePlan(events, 4, 0, input).rounds, expected);
}
assert.deepEqual(buildPracticePlan([], 4).phases, []);
assert.equal(buildPracticePlan([], 4).totalBeats, 0);

// A single long note must retain its event index and ties on every page.
const sustained = [{ note: 'C5', beats: 10 }, { note: 'R', beats: 2 }, { note: 'D5', beats: 2 }];
const pages = practicePages(sustained, 3);
assert.deepEqual(pages.map(page => [page.firstMeasureIndex, page.startBeat, page.endBeat, page.label]), [
  [0, 0, 6, '1〜2小節'], [2, 6, 12, '3〜4小節'], [4, 12, 14, '5小節'],
]);
assert.deepEqual(pages[1].measures[0][0], { note: 'C5', beats: 3, index: 0, offset: 0, tieIn: true, tieOut: true, startBeat: 6, endBeat: 9 });
assert.deepEqual(pages[1].measures[1].map(event => [event.index, event.note, event.startBeat, event.endBeat, event.tieIn, event.tieOut]), [
  [0, 'C5', 9, 10, true, false], [1, 'R', 10, 12, false, false],
]);
assert.equal(practicePageAtBeat(pages, -1), 0);
assert.equal(practicePageAtBeat(pages, 5.99), 0);
assert.equal(practicePageAtBeat(pages, 6), 1);
assert.equal(practicePageAtBeat(pages, 10), 1);
assert.equal(practicePageAtBeat(pages, 12), 2);
assert.equal(practicePageAtBeat(pages, 14), 2);
assert.equal(practicePageAtBeat(pages, 100), 2);
assert.equal(practicePageAtBeat([], 0), -1);

const pickupPages = practicePages([{ note: 'G5', beats: 1 }, { note: 'C5', beats: 8 }], 4, 1);
assert.deepEqual(pickupPages.map(page => [page.startBeat, page.endBeat]), [[0, 5], [5, 9]]);
assert.deepEqual(pickupPages.map(page => page.label), ['弱起〜1小節', '2小節']);
assert.equal(practicePages([{ note: 'G5', beats: 1 }], 4, 1)[0].label, '弱起');
assert.deepEqual(practicePages([{ note: 'C5', beats: 13 }], 4, 1).map(page => page.label), ['弱起〜1小節', '2〜3小節']);
assert.equal(pickupPages[1].measures[0][0].index, 1);
assert.equal(pickupPages[1].measures[0][0].tieIn, true);
assert.deepEqual(practicePages(Array.from({ length: 9 }, (_, index) => ({ note: index % 2 ? 'R' : 'C5', beats: 1 })), 2).map(page => [page.startBeat, page.endBeat]), [[0, 4], [4, 8], [8, 9]]);
assert.deepEqual(practicePages([]), []);
assert.deepEqual(events, snapshot);

for (const fn of [buildPracticePlan, practicePages]) {
  assert.throws(() => fn(events, 5));
  assert.throws(() => fn(events, 3, 3));
  assert.throws(() => fn(events, 3, .1));
  assert.throws(() => fn([{ note: 'C5', beats: Infinity }]));
  assert.throws(() => fn([{ note: 'C5', beats: 0 }]));
  assert.throws(() => fn([{ note: 'C5', beats: .1 }]));
}
console.log('PASS: alternating model/student timing, pickups and rests, repeat bounds, two-measure pages, sustained-note ties and page boundaries');
