import {NOTES} from './content.js';
import {parseNotes,songLevelUnlocked} from './core.js';

export const SONG_FILTERS=Object.freeze(['all','short','basic','high']);

// Use the playable notation, including a duet's second part, rather than its
// descriptive range. Duration includes rests and uses the longest part.
export function songFeatures(song){
  const voices=[parseNotes(song.notes||'')];
  if(song.secondVoice)voices.push(parseNotes(song.secondVoice));
  const pitches=[...new Set(voices.flat().filter(e=>e.note!=='R').map(e=>NOTES[e.note][1]))].sort((a,b)=>a-b);
  const totalBeats=Math.max(...voices.map(events=>events.reduce((total,e)=>total+e.beats,0)));
  return {
    totalBeats,pitches,
    short:totalBeats<=32,
    basic:pitches.length>0&&pitches.every(pitch=>[NOTES.G5[1],NOTES.A5[1],NOTES.B5[1]].includes(pitch)),
    high:pitches.some(pitch=>pitch>=NOTES.C6[1]),
  };
}

export function discoverSongs(songs,state,filter='all'){
  if(!SONG_FILTERS.includes(filter))throw Error('曲の絞り込みを確認してください');
  return songs.filter(song=>song.mode==='play'
    &&songLevelUnlocked(state,song.songLevel||0)
    &&(filter==='all'||songFeatures(song)[filter]));
}
