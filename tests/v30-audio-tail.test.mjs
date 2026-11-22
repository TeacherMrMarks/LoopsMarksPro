import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Player,nextBoundary} from '../dist/audio.js';
import {newSong,automaticCrashFor,containsCymbal,extraBreaks,Cloud,audioEntries,cymbalSettings,layerVolume,stageFill,PARTS,LAYER_IDS,cleanBreaks,breakReturnBars,passageTail} from '../dist/data.js';
import {cleanMidiSettings} from '../dist/midi.js';
import {normalizeMix,writeLocalMix,readLocalMix} from '../dist/mixer.js';
class Param{events=[];cancelScheduledValues(at){this.events=this.events.filter(x=>x.at<at);}setValueAtTime(value,at){this.events.push({value,at});}linearRampToValueAtTime(value,at){this.setValueAtTime(value,at);}setTargetAtTime() {}}
class Source{connect(){return this;}disconnect(){}stop(){this.stopped=true;}start(at,offset=0,duration){assert.ok(Number.isFinite(at)&&Number.isFinite(offset));if(duration!==undefined)assert.ok(Number.isFinite(duration));this.at=at;this.offset=offset;this.duration=duration;}}
class Context{currentTime=10;state='running';sampleRate=48000;createGain(){return {gain:new Param(),connect(){return this;},disconnect(){}};}createBufferSource(){return new Source();}async resume(){}}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function fixture(beats=4){const p=new Player();p.ctx=new Context();p.mix=p.ctx.createGain();p.context=()=>p.ctx;p.song={...newSong(),kind:'rhythm',beats,meter:beats===3?'3/4':'4/4',bpm:120,parts:{},customBreaks:[{id:'counter_1',label:'Quebra'},{id:'passage_1',label:'Passagem harmônica'}]};p.bpm=120;p.beatSeconds=.5;p.bar=beats*.5;p.ready=true;p.initialPart='a';p.loopKeys=new Set(['a','b','chorus','c']);p.buffers=new Map();for(const [key,n] of Object.entries({a:beats,b:beats,chorus:beats,c:beats,fillA:beats,fillB:beats,fillChorus:beats,autoCrash1:1,autoCrash2:1,autoCrash3:1,rideLoop:beats,hatOpenLoop:beats,hatClosedLoop:beats,counter_1:beats*2,passage_1:beats,crashStop:1})){p.buffers.set(key,{buffer:{},seconds:n*.5,beats:n});p.song.parts[key]={name:key+'.wav',path:'owner/song/'+key+'.wav',bars:n/beats,lengthBeats:n};}return p;}
async function playing(beats=4){const p=fixture(beats);await p.start();p.ctx.currentTime=p.epoch+.3;return p;}
function configureTail(p, bars=1, seconds=6.3){
  Object.assign(p.song.customBreaks.find(b=>b.id==='passage_1'),{preserveTail:true,returnBars:bars});
  p.buffers.set('passage_1',{buffer:{duration:seconds},seconds,beats:bars*p.song.beats});
  p.song.parts.passage_1={...p.song.parts.passage_1,bars:3,lengthBeats:3*p.song.beats,durationSeconds:seconds};
  return p;
}
test('V30: 3-bar chimes play once, rhythm returns after 1 bar and UI cleanup preserves tail',async()=>{
  const p=configureTail(await playing());assert.equal(p.playBreak('passage_1'),true);
  const s=p.segments.find(s=>s.key==='passage_1');near(s.source.duration,6.3);near(s.naturalEnd,s.at+p.bar);near(s.tailAudioEnd,s.at+6.3);near(p.pending.entry,s.at+p.bar);assert.equal(s.source.loop,false);
  p.ctx.currentTime=s.at+.5;assert.equal(p.summary().active,'passage_1');
  p.ctx.currentTime=s.naturalEnd+.2;assert.equal(p.summary().active,'a');assert.ok(p.segments.includes(s));assert.ok(!s.source.stopped);
  assert.equal(p.go('b'),true);p.ctx.currentTime=p.pending.entry+.2;assert.equal(p.summary().active,'b');assert.ok(!s.source.stopped);
  p.ctx.currentTime=s.tailAudioEnd+.2;p.summary();assert.equal(s.source.stopped,true);assert.ok(!p.segments.includes(s));
});
test('V30: 3/4 two-bar return, destination retarget and crash align with metric entry',async()=>{
  const p=configureTail(await playing(3),2,6);assert.equal(p.playBreak('passage_1'),true);const s=p.segments.find(s=>s.key==='passage_1');const at=p.pending.entry;near(at,s.at+2*p.bar);p.ctx.currentTime=s.at+.1;assert.ok(p.go('chorus'));near(p.pending.entry,at);assert.equal(p.overlays[0].key,'autoCrash3');near(p.overlays[0].at,at);p.ctx.currentTime=at+.1;assert.equal(p.summary().active,'chorus');assert.ok(!s.source.stopped);
});
test('V30: cancel before start and stop during tail release all passage sources',async()=>{
  const p=configureTail(await playing());p.playBreak('passage_1');let s=p.segments.find(s=>s.key==='passage_1');assert.ok(p.cancel());assert.ok(s.source.stopped);p.playBreak('passage_1');s=p.segments.find(s=>s.key==='passage_1');p.ctx.currentTime=s.naturalEnd+.2;p.summary();p.stop();assert.ok(s.source.stopped);assert.equal(p.segments.length,0);
});
test('V30: audio may be shorter than musical pause; existing ordinary passages remain unchanged',async()=>{
  const p=configureTail(await playing(),2,.5);p.playBreak('passage_1');const s=p.segments.find(s=>s.key==='passage_1');near(s.source.duration,.5);near(s.naturalEnd,s.at+2*p.bar);p.ctx.currentTime=s.at+1;assert.equal(p.summary().active,'passage_1');p.ctx.currentTime=s.naturalEnd+.1;assert.equal(p.summary().active,'a');
  const old=await playing();old.playBreak('passage_1');const seg=old.segments.find(s=>s.key==='passage_1');assert.equal(seg.tailAudioEnd,undefined);near(seg.naturalEnd,seg.at+old.bar);
});
test('V30: decoding non-integer WAV tail preserves full length, including BPM adjustment',async()=>{
  const p=configureTail(fixture(),1,6.37);const expected=p.buffers;let stretched=0;p.ctx.decodeAudioData=async data=>{const key=new TextDecoder().decode(data);const seconds=expected.get(key).seconds;return {duration:seconds,length:Math.round(seconds*48000),numberOfChannels:1,sampleRate:48000};};p.stretch=async(input,frames)=>{if(input.duration===6.37){stretched=frames;near(frames,Math.round(6.37*120/110*48000));}return {...input,length:frames,duration:frames/48000};};assert.ok(await p.prepare(p.song,110,async path=>new Blob([path.split('/').at(-1).replace('.wav','')])));assert.ok(stretched);near(p.buffers.get('passage_1').seconds,stretched/48000);assert.equal(p.buffers.get('passage_1').beats,4);await p.start();p.ctx.currentTime=p.epoch+.3;p.playBreak('passage_1');near(p.pending.entry-p.pending.changeAt,4*60/110);
});
test('V30: old config untouched, tail settings saved to cloud and independent per passage',async()=>{
  const p=configureTail(fixture(),2);let payload;await Cloud.prototype.save.call({request:async(url,opts)=>{payload=JSON.parse(opts.body);return {row_version:2};}},'owner',p.song);assert.deepEqual(payload.content.customBreaks,[{id:'counter_1',label:'Quebra'},{id:'passage_1',label:'Passagem harmônica',preserveTail:true,returnBars:2}]);assert.equal(breakReturnBars(p.song,'passage_1'),2);assert.equal(p.song.parts.passage_1.bars,3);assert.equal(passageTail(p.song,'counter_1'),false);assert.equal(breakReturnBars({...p.song,customBreaks:[]},'passage_1'),3);
});
test('V30: backup roundtrip preserves return bars, tail and original WAV bytes',async()=>{
  const source=readFileSync(new URL('../dist/backup.js',import.meta.url),'utf8').replace(/import \{ zipSync, unzipSync, strToU8, strFromU8 \} from '.\/netlify-client.js';/,`const strToU8=s=>new TextEncoder().encode(s),strFromU8=a=>new TextDecoder().decode(a);const zipSync=o=>strToU8(JSON.stringify(Object.fromEntries(Object.entries(o).map(([k,v])=>[k,[...v]]))));const unzipSync=a=>Object.fromEntries(Object.entries(JSON.parse(strFromU8(a))).map(([k,v])=>[k,new Uint8Array(v)]));`).replace(/from '\.\/([^']+)'/g,(_,file)=>`from '${new URL('../dist/'+file,import.meta.url)}'`);
  const {makeBackup,restoreBackup}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));const p=configureTail(fixture(),1,6.37);const raw=new Uint8Array(48);raw.set(new TextEncoder().encode('RIFF'));raw[47]=97;const lib={folders:[],repertoires:[]};const backup=await makeBackup({catalog:async()=>[p.song],libraryState:async()=>lib,audio:async()=>new Blob([raw])});let song,files;await restoreBackup({owner:'owner',libraryState:async()=>lib,save:async(s,f)=>{song=s;files=f;},saveLibrary:async()=>{}},backup);assert.deepEqual(song.customBreaks,cleanBreaks(p.song));assert.equal(song.parts.passage_1.durationSeconds,6.37);assert.deepEqual(new Uint8Array(await files.find(([path])=>path===song.parts.passage_1.path)[1].arrayBuffer()),raw);
});
test('V30: editor includes toggle, separate bar field and live return label',()=>{const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');for(const text of ['data-passage-tail=','data-passage-return=','Preservar cauda sonora','breakReturnBars(state.selected,key)','if (passageTail(song,part))','b.returnBars=value'])assert.ok(app.includes(text),text);});
