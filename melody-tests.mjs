import assert from 'node:assert/strict';
import {CURRICULUM_SONGS,TRACKABLE_SONGS} from './dist/song-library.js';
import {parseNotes,validateBackup} from './dist/core.js';
import {NOTES,LESSONS} from './dist/content.js';
import {measuresFor,sliceBeats,practiceWindow,fitScale} from './dist/score-utils.js';
const song=id=>TRACKABLE_SONGS.find(s=>s.id==='curriculum-'+id);
const sum=events=>events.reduce((n,e)=>n+e.beats,0);
// Independent musical invariants, checked against the adopted notations.
const expected={
 '41':[4,0,24,'C5','C6'], '42':[4,0,32,'C5','A5'], '43':[4,0,64,'C5','D6'],
 '44':[3,0,48,'C5','D6'], '45':[4,0,32,'C5','E6'],
 '05':[4,0,16,'G5','B5'], '06':[4,0,32,'C5','G5'], '07':[3,0,36,'C5','G5'],
 '08':[4,0,64,'C5','G5'], '09':[2,0,24,'C5','G5'], '10':[2,0,28,'C5','C6'],
 '11':[4,0,64,'C5','C6'], '12':[4,0,64,'D5','D6'], '13':[4,0,64,'C5','C6'],
 '29':[3,0,72,'C5','Eb6'], '31':[4,0,32,'C5','G5'],
 '15':[4,0,56,'E5','F6'], '17':[4,1,96,'C5','F6'], '21':[4,0,24,'E5','Bb5'], '25':[2,0,80,'C5','F6'], '27':[4,0,64,'C5','D6'], '30':[3,1,72,'C5','E6'],
 '14':[2,0,18,'D5','C6'], '18':[2,0,16,'E5','E6'], '19':[3,1,24,'D5','D6'], '22':[4,2,32,'C5','A5']
};
for(const[id,[meter,pickup,total,low,high]]of Object.entries(expected)){
 const s=song(id),events=parseNotes(s.notes),bars=measuresFor(events,s.meter,s.pickup);
 assert.deepEqual([s.meter,s.pickup,sum(events),...s.noteRange],[meter,pickup,total,low,high],id);
 assert.ok(s.scoreSourceUrl.startsWith('https://'));assert.ok(s.edition&&s.scope&&s.prereq&&s.question);
 assert.ok(LESSONS.some(l=>l.id===s.prereq));assert.equal(s.steps.length,6);
 assert.ok(events.every(e=>e.note==='R'||(NOTES[e.note][1]>=72&&NOTES[e.note][1]<=89)));
 assert.equal(sum(bars.flat()),total);assert.equal(sum(bars[0]),pickup||meter);
 for(const bar of bars.slice(1,-1))assert.equal(sum(bar),meter);
 for(const chunk of [2,4,meter*2]){
  let reconstructed=0;
  for(let part=0;part<Math.ceil(total/chunk);part++){
   const w=practiceWindow(events,meter,pickup,String(part),chunk);
   assert.equal(sum(w.events),Math.min(chunk,total-part*chunk));reconstructed+=sum(w.events);
   assert.equal(sum(measuresFor(w.events,meter,w.pickup).flat()),sum(w.events));
  }
  assert.equal(reconstructed,total);
 }
}
assert.deepEqual(parseNotes(song('10').notes).slice(0,4),['C5','D5','E5','F5'].map(note=>({note,beats:.5})));
assert.deepEqual(parseNotes(song('09').notes).slice(0,4),['G5','F5','E5','R'].map(note=>({note,beats:1})));
assert.deepEqual(parseNotes(song('07').notes).slice(0,6),['G5','E5','R','G5','E5','R'].map(note=>({note,beats:1})));
assert.deepEqual(parseNotes(song('19').notes).slice(0,6).map(e=>e.beats),[.75,.25,1,1,1,2]);
assert.equal(parseNotes(song('19').notes).filter(e=>e.note==='F#5').length,2);
assert.equal(NOTES['F#5'][1],78);assert.equal(NOTES['F#5'][2],'11110111');
assert.equal(NOTES.F6[2],'h1111000');assert.equal(NOTES.G6[2],'h1110000');
assert.match(song('18').scope,/冒頭8小節/);
assert.equal(CURRICULUM_SONGS.filter(s=>s.mode==='book').length,19);
assert.ok(CURRICULUM_SONGS.filter(s=>s.mode==='book').every(s=>s.notes===''&&s.meter===null&&s.noteRange===null));
// Boundary-crossing sustained notes must neither vanish nor extend a practice window.
assert.deepEqual(sliceBeats([{note:'C5',beats:3},{note:'D5',beats:3}],2,2).map(e=>[e.note,e.beats,e.continued]),[['C5',1,true],['D5',1,false]]);
const tied=measuresFor([{note:'C5',beats:4}],3).flat();assert.deepEqual(tied.map(e=>[e.beats,e.tieIn,e.tieOut]),[[3,false,true],[1,true,false]]);
const split=measuresFor([{note:'R',beats:1.5},{note:'C5',beats:4}],4).flat();assert.deepEqual(split.map(e=>e.beats),[1.5,2,.5,1.5]);
assert.deepEqual(parseNotes('C5:0.75 R:0.25'),[{note:'C5',beats:.75},{note:'R',beats:.25}]);
assert.equal(validateBackup({version:1,records:{},composition:[{note:'F#5',beats:.75}]}).composition[0].beats,.75);
// Regression: 480 / 900 must not round up to .55 and hide 15 px of the score.
assert.ok(fitScale(800,480,800,900)*900<=480);
assert.ok(fitScale(800,140,800,900)*900<=140);
assert.equal(fitScale(1000,1000,800,900),1);
assert.equal(LESSONS.find(l=>l.id==='w3-6').meter,3);
console.log('PASS: 26 score ranges/meters/pickups, melody regressions, all partial windows, ties, exact fit, unverified-score exclusion');
const chart=['11111111','1111111p','11111110','111111p0','11111100','11111000','11110111','11110000','11101110','11100000','11011000','11000000','10100000','01100000','00100000','00111110','h1111100','h1111000','h1110101','h1110000','h1110111','h1100000','h1101110','h1101100','h1001100','h1011101','h1011010'];
assert.equal(Object.keys(NOTES).length,27);
for(let i=0;i<27;i++){const n=Object.values(NOTES).find(n=>n[1]===72+i);assert.equal(n[2],chart[i],`MIDI ${72+i}`);}
assert.equal(NOTES.Db6[1],NOTES['C#6'][1]);assert.equal(NOTES.Db6[2],NOTES['C#6'][2]);
assert.equal(sum(parseNotes(song('31').secondVoice)),sum(parseNotes(song('31').notes)));
assert.ok(CURRICULUM_SONGS.filter(s=>s.mode==='book').every(s=>s.review?.reason&&s.review?.rangeStatus));
console.log('PASS: 27 Aulos chart entries / paired-hole states / enharmonic spelling / duet duration / 19 pending review records');

assert.equal(parseNotes(song('17').notes).slice(-1)[0].beats,3);
assert.equal(parseNotes(song('17').notes).filter(e=>e.note==='F6').length,2);
