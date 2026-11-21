import assert from 'node:assert/strict';
import test from 'node:test';
import { Player, pickFill } from '../dist/audio.js';
import { fillVariantId } from '../dist/data.js';
import { suggestSlot } from '../dist/importer.js';

class Param {
  cancelScheduledValues() {} setValueAtTime() {} linearRampToValueAtTime() {} setTargetAtTime() {}
}
class Source {
  connect(){ return this; } disconnect() {} stop(){ this.stopped=true; }
  start(at, offset, duration){ this.startAt=at;this.startOffset=offset;this.startDuration=duration; }
}
class Context {
  currentTime=0;state='running';sampleRate=48000;
  constructor(){globalThis.liveContext=this;this.sources=[];}
  createGain(){return {gain:new Param(),connect(){return this;},disconnect(){}};}
  createBufferSource(){const src=new Source();this.sources.push(src);return src;}
  addEventListener() {} async resume() {}
}
globalThis.window={AudioContext:Context};
const BEAT=60/80;
function fixture({includeShort=false, repeatMode='fill', fillMode='smart', noFill=false}={}) {
  const parts={a:8,aEntry:4,b:8,bEntry:4,chorus:8,chorusEntry:4,fillLight:2,
    fillStrong:4,finish:4,outro:4};
  if (!noFill) parts.fillChorus=4;
  if (includeShort) parts.fillChorus__2=2;
  const song={id:'v4-test', name:'Teste de casamento',beats:4,bpm:80,parts:{},
    transitions:{},customFills:[],repeatMode,fillMode};
  const player=new Player();
  for (const [id,beats] of Object.entries(parts)) song.parts[id]={lengthBeats:beats,bars:beats/4};
  player.song=song;player.bpm=80;player.beatSeconds=BEAT;player.bar=4*BEAT;
  player.buffers=new Map(Object.entries(parts).map(([id,beats])=>[id,{buffer:{},beats,seconds:beats*BEAT}]));
  player.ready=true;player.context();player.setMode(fillMode);
  return {player,song,ctx:liveContext};
}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);

test('V4 WAV naming maps crash-entry and duration-specific fills without changing old naming',()=>{
  assert.equal(suggestSlot('Refrão_Entrada_Crash.wav'),'chorusEntry');
  assert.equal(suggestSlot('Parte_A_com_crash.wav'),'aEntry');
  assert.equal(suggestSlot('Virada_Para_Refrão_2T.wav'),'fillChorus__2');
  assert.equal(suggestSlot('Virada_Forte_1tempo.wav'),'fillStrong__1');
  assert.equal(suggestSlot('Parte_B.wav'),'b');
  assert.equal(fillVariantId('fillChorus',3),'fillChorus__3');
});

test('first entry with crash plays once then continuous base loop repeats, with same part identity',async()=>{
  const {player,ctx}=fixture();await player.start();
  near(player.segments[0].at,player.epoch);
  assert.equal(player.segments[0].key,'aEntry');
  assert.equal(player.segments[0].source.loop,false);
  assert.equal(player.segments[1].key,'a');
  assert.equal(player.segments[1].source.loop,true);
  near(player.segments[1].at,player.epoch+4*BEAT);
  ctx.currentTime=player.epoch+BEAT;
  assert.equal(player.fromKey(),'a');
  assert.equal(player.summary().entryAttack,true);
  ctx.currentTime=player.epoch+4*BEAT+0.1;
  assert.equal(player.summary().entryAttack,false);
});

test('single base clip is backward compatible when no crash-entry WAV is provided',async()=>{
  const {player}=fixture(); player.buffers.delete('aEntry');
  await player.start();assert.equal(player.segments.length,1);
  assert.equal(player.segments[0].key,'a');assert.equal(player.segments[0].source.loop,true);
});

test('exact recorded 2T fill takes priority; chorus with crash plays then continuous loop',async()=>{
  const {player,ctx}=fixture({includeShort:true});await player.start();
  ctx.currentTime=player.epoch+player.bar*2+BEAT*1.1; // dentro do tempo 2
  assert.equal(player.go('chorus'),true);
  assert.equal(player.pending.fill,'fillChorus__2');
  assert.equal(player.pending.fillBeats,2);
  assert.equal(player.pending.offsetBeats,0);
  near(player.pending.entry,player.epoch+player.bar*3);
  near(player.pending.changeAt,player.pending.entry-2*BEAT);
  const fill=player.segments.find(s=>s.key==='fillChorus__2');
  near(fill.source.startOffset,0);
  const attack=player.segments.find(s=>s.key==='chorusEntry');
  const continuous=player.segments.find(s=>s.key==='chorus');
  near(attack.at,player.pending.entry);
  near(continuous.at,attack.at+player.bar);
  assert.equal(attack.source.loop,false);
  assert.equal(continuous.source.loop,true);
});

test('without short WAV, motor plays tail of existing 4T WAV in remaining 2 beats',async()=>{
  const {player,ctx}=fixture();await player.start();
  ctx.currentTime=player.epoch+player.bar*3+BEAT*1.1;
  assert.equal(player.go('chorus'),true);
  assert.equal(player.pending.fill,'fillChorus');
  assert.equal(player.pending.fillBeats,2);
  assert.equal(player.pending.offsetBeats,2);
  const fill=player.segments.find(s=>s.key==='fillChorus');
  near(fill.source.startOffset,2*BEAT);
  near(fill.source.startDuration,2*BEAT);
  near(player.pending.entry,player.epoch+player.bar*4);
});

test('manual fill overrides automatic before change; destination change preserves manual selection',async()=>{
  const {player,ctx}=fixture();await player.start();
  ctx.currentTime=player.epoch+player.bar*2+0.20;
  assert.equal(player.go('chorus'),true);
  assert.equal(player.fill('fillLight'),true);
  assert.equal(player.pending.family,'fillLight');
  assert.equal(player.pending.manual,true);
  assert.equal(player.go('b'),true);
  assert.equal(player.pending.dest,'b');
  assert.equal(player.pending.fill,'fillLight');
  assert.equal(player.cancel(),true);
  assert.equal(player.pending,null);
});

test('re-tapping current chorus restarts the crash entry with a fill when configured',async()=>{
  const {player,ctx}=fixture();await player.start();
  ctx.currentTime=player.epoch+player.bar*2+.15;
  assert.equal(player.go('chorus'),true);
  const firstEntry=player.pending.entry;
  ctx.currentTime=firstEntry+player.bar+.15;
  player.summary();
  assert.equal(player.fromKey(),'chorus');
  assert.equal(player.go('chorus'),true);
  assert.equal(player.pending.family,'fillChorus');
  assert.ok(player.segments.some(seg=>seg.key==='chorusEntry'&&seg.at>firstEntry));
});

test('V19: segundo toque no mesmo refrão sempre pede virada mesmo com repeatMode direct',async()=>{
  const {player,ctx}=fixture({repeatMode:'direct'});await player.start();
  ctx.currentTime=player.epoch+player.bar*2+.15;
  player.go('chorus');const entry=player.pending.entry;
  ctx.currentTime=entry+player.bar+.15;player.summary();
  assert.equal(player.go('chorus'),true);
  assert.equal(player.pending.family,'fillChorus');
  assert.ok(player.segments.some(seg=>seg.key==='chorusEntry'&&seg.at>entry));
});

test('full mode waits for complete WAV and quantizes entry to a safe beat one',async()=>{
  const {player,ctx}=fixture({fillMode:'full'});await player.start();
  ctx.currentTime=player.epoch+player.bar*2+.3;
  player.go('chorus');
  assert.equal(player.pending.fillBeats,4);
  assert.equal(player.pending.offsetBeats,0);
  assert.ok(player.pending.entry > ctx.currentTime+4*BEAT);
  near((player.pending.entry-player.epoch)/player.bar,Math.round((player.pending.entry-player.epoch)/player.bar));
});

test('final has priority and blocks a new part; cancellation works until fill starts',async()=>{
  const {player,ctx}=fixture();await player.start();
  ctx.currentTime=player.epoch+player.bar*1+.17;
  assert.equal(player.go('finish'),true);
  assert.equal(player.go('b'),false);
  assert.equal(player.pending.dest,'finish');
  assert.equal(player.cancel(),true);
});

test('fill selector: exact > existing shorter > cropped longer > null',()=>{
  const entries=new Map([['fillB',{beats:4}],['fillB__2',{beats:2}],['fillB__1',{beats:1}]]);
  assert.deepEqual(pickFill('fillB',2,entries),{key:'fillB__2',beats:2,offsetBeats:0});
  assert.deepEqual(pickFill('fillB',3,entries),{key:'fillB__2',beats:2,offsetBeats:0});
  entries.delete('fillB__2');entries.delete('fillB__1');
  assert.deepEqual(pickFill('fillB',3,entries),{key:'fillB',beats:3,offsetBeats:1});
  assert.equal(pickFill('fillA',3,entries),null);
});
