import assert from 'node:assert/strict';
import test from 'node:test';
import { Player, partBeats, nextBoundary } from '../dist/audio.js';
import { suggestSlot } from '../dist/importer.js';
import { exampleSongs } from '../dist/demo.js';
import { newSong } from '../dist/data.js';

class FakeAudioParam {
  value=1;
  cancelScheduledValues() {}
  setValueAtTime(value) { this.value=value; }
  linearRampToValueAtTime(value) { this.value=value; }
  setTargetAtTime(value) { this.value=value; }
}
class FakeAudioBuffer {
  constructor(ch,frames,sr) {this.sampleRate=sr;this.length=frames;this.numberOfChannels=ch;this.duration=frames/sr;this.data=Array.from({length:ch},()=>new Float32Array(frames));}
  getChannelData(i) {return this.data[i];}
  copyToChannel(samples,i) {this.data[i].set(samples.subarray(0,this.length));}
}
class FakeSource {
  connect() {return this;}
  disconnect() {}
  start(at) {this.scheduled=at;}
  stop() {this.stopped=true;}
}
class FakeContext {
  currentTime=0;
  state='running';
  sampleRate=11025;
  constructor() {globalThis.mockCtx=this;}
  createGain() {return {gain:new FakeAudioParam(),connect() {return this;},disconnect() {}};}
  createBuffer(ch,frames,sr) {return new FakeAudioBuffer(ch,frames,sr);}
  createBufferSource() {return new FakeSource();}
  addEventListener() {}
  async resume() {this.state='running';}
}
globalThis.window={AudioContext:FakeContext};

test('model V2 supports transitions and custom fills without rewriting V1 records',()=>{
 const model=newSong();
 assert.deepEqual(model.transitions,{});
 assert.deepEqual(model.customFills,[]);
 assert.equal(partBeats({bars:2},4),8);
 assert.equal(partBeats({bars:.5,lengthBeats:2},4),2);
});

test('intelligent WAV role detection',()=>{
 assert.equal(suggestSlot('01_Parte_A.wav'),'a');
 assert.equal(suggestSlot('03_Virada_para_Refrão.wav'),'fillChorus');
 assert.equal(suggestSlot('07_pre_refrao.wav'),'pre');
 assert.equal(suggestSlot('08_virada_leve.wav'),'fillLight');
 assert.equal(suggestSlot('Parte Alta.wav'),'high');
 assert.equal(suggestSlot('11_Acabamento_Curto.wav'),'finish');
 assert.equal(suggestSlot('12_Final.wav'),'outro');
 assert.equal(suggestSlot('unspecified.wav'),'');
});

test('quantized requests are aligned to target beat one',()=>{
 const song=structuredClone(exampleSongs[0]);
 const player = new Player();
 player.song=song;
 player.bpm=song.bpm;
 player.beatSeconds=60/song.bpm;
 player.bar=song.beats*60/song.bpm;
 player.buffers=new Map(Object.entries(song.parts).map(([key,part])=>
   [key,{buffer:new FakeAudioBuffer(1,1000,11025),seconds:key==='outro'||key==='finish'?2:part.lengthBeats*60/song.bpm,beats:part.lengthBeats}]));
 player.ready=true;
 player.context();
 return (async()=>{
  await player.start();
  mockCtx.currentTime=player.epoch+player.bar*3+0.4;
  assert.equal(player.go('chorus'),true);
  assert.equal(player.pending.fill,'fillStrong');
  assert.ok(Math.abs((player.pending.entry-player.epoch)/player.bar - Math.round((player.pending.entry-player.epoch)/player.bar))<1e-8);
  assert.equal(player.fill('fillLight'),true);
  assert.equal(player.pending.fill,'fillLight');
  assert.equal(player.pending.dest,'chorus');
  assert.equal(player.go('b'),true);
  assert.equal(player.pending.dest,'b');
  assert.equal(player.pending.fill,'fillLight');
  assert.equal(player.cancel(),true);
  assert.equal(player.pending,null);
  assert.equal(player.current().key,'a');
  assert.equal(player.current().end,Infinity);
  assert.equal(player.fill('fillSpecial'),true);
  assert.equal(player.pending.dest,'a');
  assert.equal(player.pending.fill,'fillSpecial');
  assert.equal(player.go('finish'),true);
  assert.equal(player.pending.dest,'finish');
  assert.equal(player.go('b'),false); // Closing action has priority.
  player.stop();
  assert.equal(player.running,false);
 })();
});

test('custom transition can override default fill',()=>{
 const song=structuredClone(exampleSongs[0]);
 song.customFills=[{id:'fillCustom_test',label:'Virada exclusiva'}];
 song.transitions['a>chorus']='fillCustom_test';
 const p=new Player(); p.song=song;
 p.buffers=new Map([['fillCustom_test',{}],['fillChorus',{}]]);
 assert.equal(p.autoFill('a','chorus'),'fillCustom_test');
 song.transitions['a>chorus']='none';
 assert.equal(p.autoFill('a','chorus'),null);
 delete song.transitions['a>chorus'];
 assert.equal(p.autoFill('a','chorus'),'fillChorus');
});
