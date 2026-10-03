import assert from 'node:assert/strict';
import {fresh} from './dist/core.js';
import {SONGS} from './dist/content.js';
import {CURRICULUM_SONGS,EXTRA_SONGS} from './dist/song-library.js';
import {discoverSongs,songFeatures} from './dist/song-discovery.js';

const free=SONGS.map(song=>({...song,mode:'play',songLevel:0}));
const catalogue=[...CURRICULUM_SONGS,...EXTRA_SONGS,...free];
const state=fresh(),before=structuredClone(catalogue);
const ids=songs=>songs.map(song=>song.id);

assert.deepEqual(ids(discoverSongs(catalogue,state)),[
  'curriculum-05',...ids(EXTRA_SONGS),...ids(free),
]);
assert.ok(discoverSongs(catalogue,state).every(song=>song.mode==='play'));
assert.ok(discoverSongs(catalogue,state).every(song=>catalogue.includes(song)));
assert.deepEqual(catalogue,before,'discovery does not mutate songs');
assert.deepEqual(state,fresh(),'discovery does not alter progress or settings');

state.songRecords['curriculum-05']={rating:1,best:1};
assert.ok(!discoverSongs(catalogue,state).some(song=>song.songLevel===2),'practice rating does not unlock a level');
state.songRecords['curriculum-05']={rating:1,best:2};
assert.equal(discoverSongs(catalogue,state).filter(song=>song.songLevel===2).length,5,'saved best completion unlocks the next level');
assert.ok(!discoverSongs(catalogue,state).some(song=>song.songLevel===3));
state.settings.allSongsUnlocked=true;
assert.equal(discoverSongs(catalogue,state).length,38,'teacher setting opens 26 tracked scores and 12 free scores');
assert.ok(!discoverSongs(catalogue,state).some(song=>song.mode==='book'),'teacher setting never exposes pending scores as playable');
assert.deepEqual(ids(discoverSongs(catalogue,state,'basic')),['curriculum-05','original-1','original-2']);
assert.ok(ids(discoverSongs(catalogue,state,'short')).includes('curriculum-42'),'snow fits the 32-beat duration boundary');
assert.ok(!ids(discoverSongs(catalogue,state,'short')).includes('curriculum-43'),'maple is longer than 32 beats');
assert.ok(ids(discoverSongs(catalogue,state,'high')).includes('curriculum-41'),'snail reaches high C');
assert.ok(!ids(discoverSongs(catalogue,state,'high')).includes('curriculum-42'),'snow stays below high C');
state.settings.allSongsUnlocked=false;
assert.ok(!discoverSongs(catalogue,state).some(song=>song.songLevel===3),'switching the teacher setting off restores level locks');

// These fixtures deliberately have misleading metadata; filtering must inspect
// the actual sounding pitches and rhythm durations.
const sample=(id,notes,options={})=>({id,mode:'play',songLevel:0,notes,...options});
const samples=[
  sample('three','G5 A5 B5 R:4',{noteRange:['C5','D7']}),
  sample('accidental','G5 Ab5 Bb5 B5'),
  sample('low','C5 G5',{noteRange:['G5','B5']}),
  sample('boundary','G5:4 '.repeat(7)+'R:4'),
  sample('long','G5:4 '.repeat(8)+'R:0.25'),
  sample('high','C6',{noteRange:['C5','G5']}),
  sample('duet','G5',{secondVoice:'D6'}),
  sample('rest','R:4'),
  sample('disabled','B5',{mode:'book'}),
];
assert.deepEqual(ids(discoverSongs(samples,fresh(),'basic')),['three','boundary','long']);
assert.deepEqual(ids(discoverSongs(samples,fresh(),'high')),['high','duet']);
assert.deepEqual(ids(discoverSongs(samples,fresh(),'short')),['three','accidental','low','boundary','high','duet','rest']);
assert.deepEqual(songFeatures(samples[0]),{totalBeats:7,pitches:[79,81,83],short:true,basic:true,high:false});
assert.equal(songFeatures(sample('long-duet','G5',{secondVoice:'C6:4 '.repeat(9)})).totalBeats,36);
assert.equal(songFeatures(sample('empty','')).basic,false);
assert.throws(()=>discoverSongs(samples,fresh(),'unknown'),/絞り込み/);

console.log('PASS: playable discovery, progress locks, teacher setting, free/extra songs, actual pitch and duration filters, immutable inputs');
