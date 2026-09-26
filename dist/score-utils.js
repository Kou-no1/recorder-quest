// Durations are quarter-note beats. No sound or DOM dependencies.
export function sliceBeats(events, start, length) {
  let cursor = 0;
  return events.flatMap((event, sourceIndex) => {
    const end = cursor + event.beats;
    const beats = Math.max(0, Math.min(end, start + length) - Math.max(cursor, start));
    const clipped = { ...event, beats, sourceIndex, continued: cursor < start };
    cursor = end;
    return beats ? [clipped] : [];
  });
}

export function measuresFor(events, meter = 4, pickup = 0) {
  if (![2, 3, 4].includes(meter) || pickup < 0 || pickup >= meter) throw Error('拍子を確認してください');
  const bars = [[]];
  let offset = 0, capacity = pickup || meter;
  events.forEach((event, index) => {
    let left = event.beats;
    while (left > 0) {
      // Decompose non-notatable fragments such as 2.5 into 2 + 0.5.
      const available = Math.min(left, capacity - offset);
      const beats = [4, 3, 2, 1.5, 1, .75, .5, .25].find(n => n <= available);
      if (!beats) throw Error('音の長さを確認してください');
      bars.at(-1).push({ ...event, beats, index, offset,
        tieIn: event.note !== 'R' && left < event.beats,
        tieOut: event.note !== 'R' && left > beats });
      left -= beats;
      offset += beats;
      if (offset === capacity) { bars.push([]); offset = 0; capacity = meter; }
    }
  });
  if (!bars.at(-1).length) bars.pop();
  return bars;
}

export function fitScale(width, height, naturalWidth, naturalHeight) {
  if ([width, height, naturalWidth, naturalHeight].some(n => !Number.isFinite(n) || n <= 0)) return 1;
  // Round down: a nearest-5% rounding could make the bottom line disappear.
  return Math.max(.01, Math.floor(Math.min(1, width / naturalWidth, height / naturalHeight) * 1000) / 1000);
}

export function practiceWindow(events, meter, pickup, segment, chunk) {
  if (segment === 'all') return { events, pickup };
  const start = Number(segment) * chunk;
  const position = (start + (pickup ? meter - pickup : 0)) % meter;
  return { events: sliceBeats(events, start, chunk), pickup: position ? meter - position : 0 };
}
