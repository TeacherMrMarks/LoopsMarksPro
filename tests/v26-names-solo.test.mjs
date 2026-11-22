import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MIX_IDS,normalizeMix,effectiveGain,hasSolo,readLocalMix,writeLocalMix} from '../dist/mixer.js';
import {Cloud,newSong,renamePart,resetPartName,partLabel,playableParts,firstPlayablePart,hasAudioPart,DEFAULT_FILLS,ENTRY_OF,automaticCrashFor} from '../dist/data.js';
import {Player} from '../dist/audio.js';
import {suggestSlot} from '../dist/importer.js';
import {cleanMidiSettings} from '../dist/midi.js';

test('V26: SOLO can isolate multiple channels; mute wins, master is unaffected and old profiles work',()=>{
 const m=normalizeMix({master:{level:.7,solo:true},loops:{level:.6},cymbals:{level:.4}});assert.equal(hasSolo(m),false);assert.equal(m.master.solo,false);assert.equal(effectiveGain(m,'loops'),.6);
 m.loops.solo=true;m.cymbals.solo=true;assert.equal(hasSolo(m),true);assert.equal(effectiveGain(m,'master'),.7);assert.equal(effectiveGain(m,'loops'),.6);assert.equal(effectiveGain(m,'cymbals'),.4);assert.equal(effectiveGain(m,'fills'),0);
 m.cymbals.muted=true;assert.equal(effectiveGain(m,'cymbals'),0);m.loops.solo=m.cymbals.solo=false;assert.equal(effectiveGain(m,'fills'),1);assert.equal(effectiveGain(m,'cymbals'),0);
});
test('V26: SOLO updates existing audio buses without rebuilding the source or timeline',()=>{
 class Gain{value=1;cancelScheduledValues(){}setTargetAtTime(v){this.value=v;}setValueAtTime(v){this.value=v;}}
 const node=()=>({gain:new Gain(),connect(){}});const p=new Player();p.ctx={currentTime:3,createGain:node};p.mix=node();p.epoch=1;const segment={source:{stop(){throw Error('must not stop');}}};p.segments=[segment];
 const m=normalizeMix(null);p.updateMix(m);const loop=p.bus('loops'),plates=p.bus('cymbals');m.cymbals.solo=true;p.updateMix(m);assert.equal(p.bus('loops'),loop);assert.equal(loop.gain.value,0);assert.equal(plates.gain.value,1);assert.equal(p.segments[0],segment);assert.equal(p.epoch,1);m.cymbals.solo=false;p.updateMix(m);assert.equal(loop.gain.value,1);
});
test('V26: independent names, stable IDs, transitions, WAV and controller mapping; reset restores original',()=>{
 const rhythm=newSong(),music=newSong();rhythm.parts.a={path:'a.wav',bars:1};rhythm.transitions={'a>b':'fillB'};rhythm.sequence=[{part:'a',repeats:2}];const before=structuredClone(rhythm.parts);
 assert.ok(renamePart(rhythm,'a','  Estrofe  '));assert.equal(partLabel(rhythm,'a'),'Estrofe');assert.equal(partLabel(music,'a'),'Parte A');assert.equal(partLabel(newSong(),'a'),'Parte A');assert.equal(partLabel(rhythm,'aEntry'),'Entrada Estrofe · com crash');assert.equal(partLabel(rhythm,'fillA'),'Virada para Estrofe');assert.deepEqual(rhythm.parts,before);assert.deepEqual(rhythm.transitions,{'a>b':'fillB'});assert.equal(rhythm.sequence[0].part,'a');
 const copy=structuredClone(rhythm);copy.id=crypto.randomUUID();assert.ok(renamePart(copy,'a','Verso'));assert.equal(partLabel(rhythm,'a'),'Estrofe');assert.equal(partLabel(copy,'a'),'Verso');assert.equal(playableParts(copy).find(p=>p.id==='a').label,'Verso');
 const player=new Player();player.song=rhythm;assert.equal(player.label('fillA__2'),'Virada para Estrofe (2T)');assert.equal(player.label('a'),'Estrofe');assert.equal(cleanMidiSettings({mappings:[{command:'part:a',type:'note',channel:0,number:60,anyDevice:true}]}).mappings[0].command,'part:a');
 assert.equal(renamePart(rhythm,'a','  '),false);assert.equal(renamePart(rhythm,'a','x'.repeat(53)),false);assert.equal(renamePart(rhythm,'crashStop','x'),false);assert.ok(resetPartName(rhythm,'a'));assert.equal(partLabel(rhythm,'a'),'Parte A');
});
test('V26: custom parts keep their identifier and original label when renamed',()=>{
 const s=newSong(),id='section_aabbccddeeff';s.customSections=[{id,label:'Parte F'}];s.parts[id]={path:'f.wav',bars:1};assert.ok(renamePart(s,id,'Solo de guitarra'));assert.equal(partLabel(s,id),'Solo de guitarra');assert.equal(partLabel(s,id+'Entry'),'Entrada Solo de guitarra · com crash');assert.equal(s.customSections[0].id,id);assert.equal(s.customSections[0].defaultLabel,'Parte F');assert.equal(firstPlayablePart(s),id);assert.ok(resetPartName(s,id));assert.equal(partLabel(s,id),'Parte F');
});
test('V26: optional D/E loops, corresponding fills, upload recognition and controller commands',()=>{
 const s=newSong();assert.equal(firstPlayablePart(s),null);s.parts.d={path:'d.wav',bars:1};s.parts.e={path:'e.wav',bars:1};assert.equal(firstPlayablePart(s),'d');assert.equal(DEFAULT_FILLS.d,'fillD');assert.equal(ENTRY_OF.e,'eEntry');assert.deepEqual(playableParts(s).filter(p=>hasAudioPart(s,p.id)).map(p=>p.id),['d','e']);assert.equal(suggestSlot('Parte_D.wav'),'d');assert.equal(suggestSlot('Parte_E_com_crash.wav'),'eEntry');assert.equal(suggestSlot('Virada_D_2T.wav'),'fillD__2');assert.ok(automaticCrashFor(s,'d',()=>true));assert.equal(cleanMidiSettings({mappings:[{command:'part:e',type:'note',channel:0,number:61}]}).mappings.length,1);
});
test('V26: cloud payload and local profile retain solo and labels',async()=>{
 const s=newSong();renamePart(s,'b','Segunda estrofe');s.mixer=normalizeMix(null);s.mixer.cymbals.solo=true;let payload;await Cloud.prototype.save.call({request:async(url,opts)=>{payload=JSON.parse(opts.body);return {row_version:1};}},'owner',s);assert.deepEqual(payload.content.partLabels,{b:'Segunda estrofe'});assert.equal(payload.content.mixer.cymbals.solo,true);
 const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};writeLocalMix(storage,s,s.mixer);assert.equal(readLocalMix(storage,s).cymbals.solo,true);assert.equal(readLocalMix(storage,newSong()),null);
});
test('V26: backup round trip preserves names, original custom labels, SOLO and controller IDs (codec simulated)',async()=>{
 const src=readFileSync(new URL('../dist/backup.js',import.meta.url),'utf8').replace(/import \{ zipSync, unzipSync, strToU8, strFromU8 \} from '.\/netlify-client.js';/,`const strToU8=s=>new TextEncoder().encode(s),strFromU8=a=>new TextDecoder().decode(a);const zipSync=o=>strToU8(JSON.stringify(Object.fromEntries(Object.entries(o).map(([k,v])=>[k,[...v]]))));const unzipSync=a=>Object.fromEntries(Object.entries(JSON.parse(strFromU8(a))).map(([k,v])=>[k,new Uint8Array(v)]));`).replace(/from '\.\/([^']+)'/g,(_,file)=>`from '${new URL('../dist/'+file,import.meta.url)}'`);
 const {makeBackup,restoreBackup}=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
 const store=new Map();globalThis.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
 try{const s=newSong();const id='section_aabbccddeeff';s.customSections=[{id,label:'Parte F'}];s.parts.a={path:'a.wav',bars:1};s.parts[id]={path:'f.wav',bars:1};renamePart(s,'a','Estrofe');renamePart(s,id,'Solo');s.mixer=normalizeMix(null);s.mixer.loops.solo=true;writeLocalMix(localStorage,s,s.mixer);localStorage.setItem('loops-v12-pedal-map',JSON.stringify({KeyA:{slot:0,command:'part:'+id}}));localStorage.setItem('loops-v22-midi-settings',JSON.stringify({enabled:true,mappings:[{command:'part:'+id,type:'note',channel:0,number:60}]}));const bytes=new Uint8Array(44);bytes.set(new TextEncoder().encode('RIFF'));const lib={folders:[],repertoires:[]};const zip=await makeBackup({catalog:async()=>[s],libraryState:async()=>lib,audio:async()=>new Blob([bytes])});store.clear();let restored,files;await restoreBackup({owner:'owner',libraryState:async()=>lib,save:async(song,f)=>{restored=song;files=f;},saveLibrary:async()=>{}},zip);assert.deepEqual(restored.partLabels,s.partLabels);assert.deepEqual(restored.customSections,s.customSections);assert.equal(restored.mixer.loops.solo,true);assert.equal(readLocalMix(localStorage,restored).loops.solo,true);assert.equal(files.length,2);assert.equal(JSON.parse(localStorage.getItem('loops-v12-pedal-map')).KeyA.command,'part:'+id);assert.equal(JSON.parse(localStorage.getItem('loops-v22-midi-settings')).mappings[0].command,'part:'+id);}finally{delete globalThis.localStorage;}
});
test('V26: compact UI exposes SOLO and rename via two taps plus pencil; high contrast CSS',()=>{
 const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8'),css=readFileSync(new URL('../dist/styles.css',import.meta.url),'utf8');for(const term of ['mixer-solo','mixer-clear-solo','data-rename-part','now-lastRenameTap.time<=450','part-rename-pencil','resetPartName','partLabel(song,'])assert.ok(app.includes(term),term);assert.match(css,/mixer-channel label\{color:#fff!important;opacity:1!important/);
});
