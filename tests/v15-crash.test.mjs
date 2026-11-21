import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Player } from '../dist/audio.js';
import { PARTS, CRASH_STOPS } from '../dist/data.js';
import { suggestSlot } from '../dist/importer.js';

const app=readFileSync(new URL('../dist/app.js', import.meta.url),'utf8');
const css=readFileSync(new URL('../dist/styles.css', import.meta.url),'utf8');

class FakeParam { cancelScheduledValues(){} setValueAtTime(){} linearRampToValueAtTime(){} setTargetAtTime(){} }
class FakeSource {
  connect(){return this;}disconnect(){}stop(){this.stopped=true;}
  start(at,offset,duration){this.at=at;this.offset=offset;this.duration=duration;}
}
class FakeContext {
  currentTime=0;state='running';sampleRate=48000;
  createGain(){return {gain:new FakeParam(),connect(){return this;},disconnect(){}};}
  createBufferSource(){return new FakeSource();}
  addEventListener(){}async resume(){}
}

function setup() {
  const p=new Player();
  p.song={kind:'rhythm',bpm:80,beats:4,parts:{},
    transitions:{'a>crashStop':'fillStrong'},sequence:[]};
  p.bpm=80;p.beatSeconds=.75;p.bar=3;p.epoch=0;p.initialPart='a';
  p.loopKeys=new Set(['a','b']);p.ready=true;
  p.buffers=new Map([
    ['a',{buffer:{},beats:4,seconds:3}],
    ['b',{buffer:{},beats:4,seconds:3}],
    ['fillStrong',{buffer:{},beats:4,seconds:3}],
    ['crashStop',{buffer:{},beats:4,seconds:6.25}],
    ['crashStop2',{buffer:{},beats:4,seconds:4.8}],
  ]);
  p.ctx=new FakeContext();
  p.mix=p.ctx.createGain();
  return p;
}

test('V15: Crash final is a distinct group and 3 WAV slots, not a loop entrance',()=>{
  assert.deepEqual(CRASH_STOPS.map(p=>p.id),['crashStop','crashStop2','crashStop3']);
  assert.equal(PARTS.find(p=>p.id==='aEntry').group,'entradas');
  assert.equal(PARTS.find(p=>p.id==='crashStop').group,'crashstops');
  assert.match(app,/\['loopcrash','Loop \+ Crash'/);
  assert.match(app,/\['crash','Crash'/);
  assert.match(app,/editorSection\(song, 'crashstops', 'Crash'/);
  assert.match(app,/crash-stop-pad/);
  assert.match(app, /CRASH_STOPS\.map\(p=>\['part:'\+p\.id,'Crash final: '/);
});

test('V15: intelligent import recognizes stop crashes without affecting entrances',()=>{
  assert.equal(suggestSlot('Crash_Final.wav'),'crashStop');
  assert.equal(suggestSlot('Crash_Final_2.wav'),'crashStop2');
  assert.equal(suggestSlot('Bumbo_Prato_3.wav'),'crashStop3');
  assert.equal(suggestSlot('Parte_A_com_crash.wav'),'aEntry');
  assert.equal(suggestSlot('Refrão_Entrada_Crash.wav'),'chorusEntry');
});

test('V15: Crash final skips transition fills and closes only after full one-shot tail',async()=>{
  const previous=globalThis.window;globalThis.window={AudioContext:FakeContext};
  try{
    const p=setup();await p.start();
    p.ctx.currentTime=p.epoch+p.bar+0.22;
    const expected=p.epoch+p.bar*2;
    assert.equal(p.go('crashStop'),true);
    assert.equal(p.pending.dest,'crashStop');
    assert.equal(p.pending.fill,null);
    assert.equal(p.pending.family,null);
    assert.ok(Math.abs(p.pending.entry-expected)<.0001);
    assert.equal(p.go('b'),false,'Crash final cannot be replaced with a loop once queued');
    const blast=p.segments.find(s=>s.key==='crashStop');
    assert.equal(blast.source.loop,false);
    assert.ok(Math.abs(blast.at-expected)<.0001);
    assert.ok(Math.abs(blast.naturalEnd-(expected+6.25))<.0001);
    p.ctx.currentTime=expected+4.3;
    assert.equal(p.summary().running,true,'Crash WAV still sounds during its tail');
    assert.equal(p.summary().active,'crashStop');
    p.ctx.currentTime=expected+6.30;
    assert.equal(p.summary().running,false,'player ends after full WAV duration');
  }finally{globalThis.window=previous;}
});

test('V15: manually selected fill does not continue into final Crash',async()=>{
  const previous=globalThis.window;globalThis.window={AudioContext:FakeContext};
  try{
    const p=setup();await p.start();p.ctx.currentTime=p.epoch+p.bar+.15;
    assert.equal(p.go('b'),true);
    assert.equal(p.pending.fill,null);
    // A pending manual fill from a preceding command must not be inherited by Crash.
    p.pending.manual=true;p.pending.family='fillStrong';
    assert.equal(p.go('crashStop2'),true);
    assert.equal(p.pending.fill,null);
    assert.equal(p.pending.manual,false);
    assert.equal(p.pending.dest,'crashStop2');
  }finally{globalThis.window=previous;}
});

test('V15: sidebar has matching main buttons, sync moves to administrative header',()=>{
  assert.match(app,/v15-primary-nav/);
  assert.match(app,/class="v15-sync-status"/);
  assert.match(app,/<span class="v15-sync-status" id="sync-label"/);
  assert.doesNotMatch(app,/<button class="nav-link" data-action="sync" title="Estado da sincronização"/);
  assert.match(css,/\.v12-sidebar \.v12-group,\.v12-sidebar \.v15-primary-nav/);
  assert.match(css,/\.v15-sync-status/);
});
