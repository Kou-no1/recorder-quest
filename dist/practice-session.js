import { measuresFor } from './score-utils.js';

// All times are quarter-note beats; neither this plan nor page mapping uses a
// clock, sound, or DOM. The player can therefore cancel its own scheduled work.
function validate(events, meter, pickup) {
  if (![2, 3, 4].includes(meter) || !Number.isFinite(pickup) || pickup < 0 || pickup >= meter || pickup * 4 % 1) {
    throw new RangeError('拍子と弱起を確認してください');
  }
  if (!Array.isArray(events) || events.some(event => !event || typeof event.note !== 'string' || !Number.isFinite(event.beats) || event.beats <= 0 || event.beats * 4 % 1)) {
    throw new TypeError('音と長さを確認してください');
  }
}

export function buildPracticePlan(events, meter = 4, pickup = 0, repeats = 1) {
  validate(events, meter, pickup);
  const rounds = Number.isFinite(Number(repeats)) ? Math.max(1, Math.min(3, Math.floor(Number(repeats)))) : 1;
  const countInBeats = meter + (pickup ? meter - pickup : 0);
  const phraseBeats = events.reduce((sum, event) => sum + event.beats, 0);
  const phases = [];
  let cursor = 0;
  if (phraseBeats) {
    for (let round = 1; round <= rounds; round++) {
      for (const type of ['model', 'student']) {
        phases.push({ type: 'count-in', target: type, round, startBeat: cursor, endBeat: cursor + countInBeats, beats: countInBeats, events: [] });
        cursor += countInBeats;
        let offsetBeat = 0;
        const scheduled = events.map((event, index) => {
          const result = { ...event, index, offsetBeat, startBeat: cursor + offsetBeat, endBeat: cursor + offsetBeat + event.beats };
          offsetBeat += event.beats;
          return result;
        });
        phases.push({ type, round, startBeat: cursor, endBeat: cursor + phraseBeats, beats: phraseBeats, events: scheduled });
        cursor += phraseBeats;
      }
    }
  }
  return { phases, totalBeats: cursor, phraseBeats, countInBeats, rounds };
}

export function practicePages(events, meter = 4, pickup = 0) {
  validate(events, meter, pickup);
  const bars = measuresFor(events, meter, pickup);
  let cursor = 0;
  const measures = bars.map(bar => bar.map(event => {
    const fragment = { ...event, startBeat: cursor, endBeat: cursor + event.beats };
    cursor += event.beats;
    return fragment;
  }));
  const pages = [];
  for (let firstMeasureIndex = 0; firstMeasureIndex < measures.length; firstMeasureIndex += 2) {
    const pageMeasures = measures.slice(firstMeasureIndex, firstMeasureIndex + 2);
    const first = pageMeasures[0][0];
    const last = pageMeasures.at(-1).at(-1);
    const firstLabel = pickup && firstMeasureIndex === 0 ? '弱起' : `${firstMeasureIndex + (pickup ? 0 : 1)}小節`;
    const lastMeasure = firstMeasureIndex + pageMeasures.length - (pickup ? 1 : 0);
    pages.push({
      pageIndex: pages.length,
      measures: pageMeasures,
      firstMeasureIndex,
      startBeat: first.startBeat,
      endBeat: last.endBeat,
      label: pageMeasures.length === 1 ? firstLabel : `${pickup && firstMeasureIndex === 0 ? '弱起' : firstMeasureIndex + (pickup ? 0 : 1)}〜${lastMeasure}小節`,
    });
  }
  return pages;
}

// Pages occupy [startBeat, endBeat), so a sustained note moves to the next page
// at its bar boundary even though its source event index has not changed.
export function practicePageAtBeat(pages, beat) {
  if (!pages.length) return -1;
  if (!Number.isFinite(beat) || beat <= pages[0].startBeat) return 0;
  const index = pages.findIndex(page => beat < page.endBeat);
  return index < 0 ? pages.length - 1 : index;
}
