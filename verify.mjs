import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {WORLDS,LESSONS,SONGS,NOTES} from './dist/content.js';
import {fresh,parseNotes,points,completed,recommend,record,validateBackup} from './dist/core.js';
assert.equal(WORLDS.length,12);assert.equal(LESSONS.length,96);assert.equal(SONGS.length,12);
const ids=new Set(LESSONS.map(l=>l.id));assert.equal(ids.size,96);
for(const l of LESSONS){assert.equal(l.steps.length,3);assert.ok(l.goal&&l.check&&l.tip&&l.question);assert.ok(!l.prereq||ids.has(l.prereq));if(l.prereq)assert.ok(LESSONS.findIndex(x=>x.id===l.prereq)<LESSONS.indexOf(l));parseNotes(l.notes);}
for(const [n,[name,midi,pattern]] of Object.entries(NOTES)){assert.ok(name);assert.ok(midi>=72&&midi<=91);assert.match(pattern,/^[h01][01]{7}$/);assert.equal(pattern.length,8);}
assert.equal(NOTES.F5[2],'11111000');assert.equal(NOTES.D6[2],'00100000');assert.equal(NOTES.E6[2][0],'h');
for(const s of SONGS){const events=parseNotes(s.notes);const total=events.reduce((a,e)=>a+e.beats,0);assert.ok(events.length);assert.ok(Number.isFinite(total));assert.ok(s.source);}
const s=fresh();assert.equal(recommend(s).lesson.id,'w1-1');record(s,'w1-1',2,'できた');assert.equal(points(s),20);assert.equal(completed(s),1);assert.equal(recommend(s).lesson.id,'w1-2');record(s,'w1-1',2,'もう一度');assert.equal(points(s),20);record(s,'w1-1',3,'２回できた');assert.equal(points(s),30);record(s,'w1-1',1,'今日は難しい');assert.equal(points(s),30);assert.equal(completed(s),0);record(s,'w1-3',1,'むずかしい');assert.equal(recommend(s).lesson.id,'w1-2');
s.notes['w10-1']='予想と結果';s.composition=[{note:'C5',beats:1},{note:'R',beats:2}];assert.deepEqual(validateBackup(JSON.parse(JSON.stringify(s))),s);
for(const invalid of [null,{}, {version:1,records:[]},{version:1,records:{missing:{rating:3}}},{version:1,records:{},composition:[{note:'oops',beats:1}]},{version:1,records:{},composition:Array(33).fill({note:'C5',beats:1})}])assert.throws(()=>validateBackup(invalid));
assert.throws(()=>parseNotes('C9:1'));assert.throws(()=>parseNotes('C5:0'));assert.throws(()=>record(s,'fake',2,''));
const html=readFileSync('dist/index.html','utf8');for(const m of html.matchAll(/(?:src|href)="\.\/([^"#]+)"/g))assert.ok(existsSync('dist/'+m[1]),m[1]);
console.log('PASS: 96 lessons / 288 steps / 12 songs / fingering schema / progress / no duplicate points / recommendation / backup roundtrip / invalid imports / local assets');
