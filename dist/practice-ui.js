import {NOTES} from './content.js';
import {practicePages} from './practice-session.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fingerLabels = ['左の親指', '左の人さし指', '左の中指', '左の薬指', '右の人さし指', '右の中指', '右の薬指', '右の小指'];

export function nextFingerHint(note, next) {
  if (next === 'R') return '次は休み。息をととのえよう。';
  if (!NOTES[next]) return '最後の音まで、ていねいに。';
  if (!NOTES[note]) return `休みの間に、${NOTES[next][0]}の指をじゅんびしよう。`;
  const from = NOTES[note][2], to = NOTES[next][2];
  if (!from || !to) return `${NOTES[next][0]}の指を、付属の運指表で確かめよう。`;
  const changes = [...to].flatMap((value, i) => value === from[i] ? [] : [
    `${fingerLabels[i]}を${value === '1' ? '押さえる' : value === 'h' ? '少し開ける' : value === 'p' ? '小穴の大きい方だけ押さえる' : '離す'}`
  ]);
  return `次は${NOTES[next][0]}。${changes.length ? changes.join('・') : '指の形はそのまま。'}`;
}

export function practicePageMarkup({pages, pageIndex, events, secondEvents, meter, pickup, staff}) {
  const page = pages[pageIndex];
  if (!page) return '';
  const next = pages[pageIndex + 1];
  const preview = next ? next.measures.flat().filter(e => !e.tieIn).slice(0, 4)
    .map(e => e.note === 'R' ? '休み' : NOTES[e.note][0]).join(' → ') : '';
  const secondary = secondEvents && practicePages(secondEvents, meter, pickup)[pageIndex];
  return `${secondary ? '<h2 class="practice-part">第1パート：旋律</h2>' : ''}${staff(events, meter, pickup, page)}${secondary ? `<h2 class="practice-part">第2パート：長い音の伴奏</h2>${staff(secondEvents, meter, pickup, secondary).replaceAll('data-event=', 'data-secondary-event=')}` : ''}<p class="practice-preview">${next ? `次は${esc(next.label)}：${esc(preview)}` : 'この範囲の最後です。音の終わりも聴こう。'}</p>`;
}

export function practiceScreen({song, events, secondEvents, part, meter, pickup, pages, pageIndex, tempo, names, mode, repeats, span, clickTrack, staff, fingering, chosenNote, rangeLabel}) {
  const page = pages[pageIndex];
  const firstIndex = page?.measures[0][0].index || 0;
  const firstEvent = events[firstIndex];
  const first = events.slice(firstIndex).find(e => e.note !== 'R')?.note || chosenNote;
  return `<section class="practice-screen ${secondEvents ? 'practice-duet' : ''}" aria-labelledby="practice-title">
    <header class="practice-header"><div><span class="eyebrow">大きな楽譜で練習</span><h1 id="practice-title">${esc(song.title)}</h1><p class="muted">${esc(rangeLabel)} ・ ${meter}/4拍子${song.secondVoice ? ` ・ ${part === '2' ? '第2パート' : part === 'both' ? '2人で合わせる' : '第1パート'}` : ''}</p></div><button class="button secondary" data-action="practice-close">曲の画面へ戻る</button></header>
    <div class="practice-settings"><div class="practice-modes" role="group" aria-label="練習のしかた"><button class="button ${mode === 'model' ? 'primary' : 'secondary'}" data-practice-mode="model" aria-pressed="${mode === 'model'}">お手本を聴く</button><button class="button ${mode === 'echo' ? 'primary' : 'secondary'}" data-practice-mode="echo" aria-pressed="${mode === 'echo'}">お手本 → 自分</button></div><label>吹く範囲 <select id="practice-span"><option value="page" ${span === 'page' ? 'selected' : ''}>表示中の2小節</option><option value="selection" ${span === 'selection' ? 'selected' : ''}>選んだ範囲を通す</option></select></label><label ${mode === 'model' ? 'hidden' : ''}>交代する回数 <select id="practice-repeats">${[1,2,3].map(n => `<option value="${n}" ${repeats === n ? 'selected' : ''}>${n}回</option>`).join('')}</select></label></div>
    <div class="practice-state"><span id="practice-phase" class="practice-phase">じゅんび</span><p class="player-status" role="status" aria-live="polite">${mode === 'echo' ? 'お手本を聴いたあと、カウントに合わせて自分で吹こう。' : 'カウントのあと、お手本が流れます。'}</p></div>
    <div class="practice-layout"><div class="practice-sheet"><nav class="practice-page-nav" aria-label="表示する小節"><button class="button secondary" data-action="practice-prev" ${pageIndex === 0 ? 'disabled' : ''}>← 前の2小節</button><output id="practice-page-label">${esc(page?.label)}（${pageIndex + 1}/${pages.length}）</output><button class="button secondary" data-action="practice-next" ${pageIndex === pages.length - 1 ? 'disabled' : ''}>次の2小節 →</button></nav><div id="practice-score" data-practice-page="${pageIndex}">${practicePageMarkup({pages, pageIndex, events, secondEvents, meter, pickup, staff})}</div></div><aside class="practice-fingers"><div class="live-fingering">${fingering(first, true)}</div><p id="practice-finger-hint" class="practice-finger-hint">${esc(nextFingerHint(firstEvent?.note, events[firstIndex + 1]?.note))}</p></aside></div>
    <div class="practice-controls"><button class="button primary play-toggle" data-action="play">${mode === 'echo' ? '▶ 交代練習をはじめる' : '▶ お手本を聴く'}</button><button class="button secondary" data-action="stop">■ とめる</button><button class="button secondary" data-action="practice-slower">ゆっくりにする</button><label class="tempo">速さ <input id="tempo" type="range" min="40" max="140" step="1" value="${tempo}" aria-label="演奏の速さ"><output>${tempo}</output></label><label class="check-inline"><input id="click-track" type="checkbox" ${clickTrack ? 'checked' : ''}>吹くときも拍の音</label><button class="text-button" data-action="names">音名を${names ? 'かくす' : '出す'}</button></div>
    <p class="practice-footnote">自分の番では、お手本の旋律が止まります。できたら「次の2小節」へ。お手本は電子音です。</p>
  </section>`;
}
