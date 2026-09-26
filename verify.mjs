import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {WORLDS,LESSONS,SONGS,NOTES} from './dist/content.js';
import {SONG_LEVELS,CURRICULUM_SONGS,EXTRA_SONGS,TRACKABLE_SONGS} from './dist/song-library.js';
import {fresh,parseNotes,points,completed,recommend,record,recordSong,songProgress,songTarget,songLevelUnlocked,validateBackup} from './dist/core.js';
assert.equal(WORLDS.length,12);assert.equal(LESSONS.length,96);assert.equal(SONGS.length,12);
assert.equal(SONG_LEVELS.length,8);assert.equal(CURRICULUM_SONGS.length,40);
assert.equal(new Set(CURRICULUM_SONGS.map(s=>s.id)).size,40);
assert.equal(new Set(TRACKABLE_SONGS.map(s=>s.id)).size,45);
assert.deepEqual(EXTRA_SONGS.map(s=>s.title),['かたつむり','雪','もみじ','ふるさと','春が来た']);
// Extra songs earn their own stamps but never advance the original 40-song levels.
const extraState=fresh();
assert.ok(songLevelUnlocked(extraState,-1));
for(const song of EXTRA_SONGS){
 assert.equal(song.mode,'play');assert.equal(song.songLevel,-1);assert.equal(song.steps.length,6);
 assert.ok(parseNotes(song.notes).every(e=>e.note==='R'||NOTES[e.note][2]));
 extraState.songSteps[song.id]=Array(6).fill(true);
 recordSong(extraState,song.id,2);recordSong(extraState,song.id,3);recordSong(extraState,song.id,3);
}
assert.equal(points(extraState),75);assert.equal(songProgress(extraState,1),0);
assert.equal(songLevelUnlocked(extraState,2),false);assert.equal(completed(extraState),0);
assert.deepEqual(validateBackup(JSON.parse(JSON.stringify(extraState))),extraState);
assert.throws(()=>validateBackup({...extraState,songRecords:{'curriculum-46':{rating:3,date:new Date().toISOString()}}}));
for(const level of SONG_LEVELS){const songs=CURRICULUM_SONGS.filter(s=>s.songLevel===level.id);assert.equal(songs.length,5,`LEVEL ${level.id}`);}
assert.deepEqual(CURRICULUM_SONGS.map(s=>s.title),['きれいな ソラシ','坂道','雨上がり','リコーダーと友だち','ホット・クロス・バンズ','メリーさんのひつじ','かっこう','ちょうちょう','ぶん ぶん ぶん','小ぎつね','春の小川','茶つみ','ふじ山','うさぎ','さくら さくら','エーデルワイス','大きな古時計','茶色の小びん','ハッピー バースデイ トゥ ユー','パフ','リボンのおどり（ラ バンバ）','こげよ マイケル','キリマンジャロ','カントリー・ロード','威風堂々','ラバーズ コンチェルト','星の世界','君をのせて','メヌエット','木星','メリーさんのひつじ（二重奏）','雨の公園（輪奏）','林の朝（輪唱）','そよ風のデュエット','静かな湖畔（輪唱）','Believe','翼をください','マイ バラード','旅立ちの日に','勇気100%']);
for(const song of CURRICULUM_SONGS){assert.ok(song.title&&song.kind&&song.goal&&song.focus&&song.source&&song.rightsNote);assert.equal(song.steps.length,song.mode==='play'?6:3);assert.ok(['book','play'].includes(song.mode));if(song.mode==='play'){assert.ok(parseNotes(song.notes).length);}else{assert.equal(song.notes,'');assert.match(song.rightsNote,/楽譜/);}}
assert.equal(CURRICULUM_SONGS.filter(s=>s.mode==='play').length,21);
const ids=new Set(LESSONS.map(l=>l.id));assert.equal(ids.size,96);
for(const l of LESSONS){assert.equal(l.steps.length,3);assert.ok(l.goal&&l.check&&l.tip&&l.question);assert.ok(!l.prereq||ids.has(l.prereq));if(l.prereq)assert.ok(LESSONS.findIndex(x=>x.id===l.prereq)<LESSONS.indexOf(l));parseNotes(l.notes);}
for(const [n,[name,midi,pattern]] of Object.entries(NOTES)){assert.ok(name);assert.ok(midi>=72&&midi<=98);if(pattern!==null){assert.match(pattern,/^[h01][01]{5}[01p]{2}$/);assert.equal(pattern.length,8);}else assert.ok(['F6','G6','F#5'].includes(n));}
assert.equal(NOTES.F5[2],'11111000');assert.equal(NOTES.D6[2],'00100000');assert.equal(NOTES.E6[2][0],'h');
for(const s of SONGS){const events=parseNotes(s.notes);const total=events.reduce((a,e)=>a+e.beats,0);assert.ok(events.length);assert.ok(Number.isFinite(total));assert.ok(s.source);}
const s=fresh();assert.equal(recommend(s).lesson.id,'w1-1');record(s,'w1-1',2,'できた');assert.equal(points(s),20);assert.equal(completed(s),1);assert.equal(recommend(s).lesson.id,'w1-2');record(s,'w1-1',2,'もう一度');assert.equal(points(s),20);record(s,'w1-1',3,'２回できた');assert.equal(points(s),30);record(s,'w1-1',1,'今日は難しい');assert.equal(points(s),30);assert.equal(completed(s),0);record(s,'w1-3',1,'むずかしい');assert.equal(recommend(s).lesson.id,'w1-2');
s.notes['w10-1']='予想と結果';s.composition=[{note:'C5',beats:1},{note:'R',beats:2}];assert.deepEqual(validateBackup(JSON.parse(JSON.stringify(s))),s);
for(const invalid of [null,{}, {version:1,records:[]},{version:1,records:{missing:{rating:3}}},{version:1,records:{},composition:[{note:'oops',beats:1}]},{version:1,records:{},composition:Array(33).fill({note:'C5',beats:1})}])assert.throws(()=>validateBackup(invalid));
assert.throws(()=>parseNotes('C9:1'));assert.throws(()=>parseNotes('C5:0'));assert.throws(()=>record(s,'fake',2,''));
const songsState=fresh();assert.equal(songLevelUnlocked(songsState,1),true);assert.equal(songLevelUnlocked(songsState,2),false);assert.equal(songTarget(1),1);assert.equal(songTarget(2),3);
recordSong(songsState,'curriculum-05',2);assert.equal(points(songsState),10);assert.equal(songLevelUnlocked(songsState,2),true);recordSong(songsState,'curriculum-05',3);recordSong(songsState,'curriculum-05',1);assert.equal(points(songsState),15);assert.equal(songProgress(songsState,1),1);
for(const id of ['06','07','08'])recordSong(songsState,'curriculum-'+id,2);assert.equal(songLevelUnlocked(songsState,3),true);assert.equal(songLevelUnlocked(songsState,4),false);
songsState.songSteps['curriculum-05']=[true,false,true,false,false,true];assert.deepEqual(validateBackup(JSON.parse(JSON.stringify(songsState))),songsState);
assert.throws(()=>recordSong(songsState,'fake',2));assert.throws(()=>validateBackup({version:1,records:{},songRecords:{fake:{rating:2,date:new Date().toISOString()}}}));assert.throws(()=>validateBackup({version:1,records:{},songSteps:{'curriculum-05':['yes']}}));
const oldBackup=validateBackup({version:1,records:{}});assert.deepEqual(oldBackup.songRecords,{});assert.deepEqual(oldBackup.songSteps,{});assert.equal(oldBackup.settings.allSongsUnlocked,false);
const legacy=validateBackup({version:1,records:{},songRecords:{'curriculum-01':{rating:3,date:'2026-09-10T00:00:00Z'}}});assert.equal(points(legacy),15);assert.equal(songProgress(legacy,1),0);
const html=readFileSync('dist/index.html','utf8');for(const m of html.matchAll(/(?:src|href)="\.\/([^"#]+)"/g))assert.ok(existsSync('dist/'+m[1]),m[1]);const app=readFileSync('dist/app.js','utf8');for(const m of app.matchAll(/from '\.\/([^']+)'/g))assert.ok(existsSync('dist/'+m[1]),m[1]);for(const control of ['score-fit','score-out','score-in','score-reset'])assert.match(app,new RegExp(`data-action="${control}"`));assert.match(readFileSync('dist/style.css','utf8'),/\.score-zoom-surface\{zoom:var\(--score-zoom/);
console.log('PASS: 96 lessons / 288 steps / 40 candidates (8×5), 21 playable scores + 5 seasonal songs / 12 free songs / unlocks / song stamps / score zoom controls / fingering schema / progress / backup compatibility / invalid imports / local assets');
