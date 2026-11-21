import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Player } from '../dist/audio.js';
import { PARTS, CRASH_STOPS } from '../dist/data.js';
import { suggestSlot } from '../dist/importer.js';

const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../dist/styles.css',import.meta.url),'utf8');
class FakeParam {cancelScheduledValues(){}setValueAtTime(){}linearRampToValueAtTime(){}setTargetAtTime(){}}
class FakeSource {
  loop=false; connect(){return this;}disconnect(){}stop(){this.stopped=true;}
  start(at,offset,duration){this.at=at;this.offset=offset;this.duration=duration;}
}
class FakeContext {
  currentTime=0;state='running';sampleRate=48000;
  createGain(){return {gain:new FakeParam(),connect(){return this;},disconnect(){}};}
  createBufferSource(){return new FakeSource();}
  addEventListener(){}async resume(){}
}
function setup(){
  const p=new Player();p.song={kind:'rhythm',bpm:80,beats:4,parts:{},transitions:{'a>crashStop':'fillStrong'},sequence:[]};
  p.bpm=80;p.beatSeconds=.75;p.bar=3;p.epoch=0;p.initialPart='a';p.loopKeys=new Set(['a','b']);p.ready=true;
  p.buffers=new Map([['a',{buffer:{},beats:4,seconds:3}],['b',{buffer:{},beats:4,seconds:3}],
    ['fillStrong',{buffer:{},beats:4,seconds:3}],['crashStop',{buffer:{},beats:4,seconds:6.25}],
    ['crashStop2',{buffer:{},beats:4,seconds:4.8}]]);
  p.ctx=new FakeContext();p.mix=p.ctx.createGain();return p;
}
test('V20: três slots Crash herdados da V15 seguem reconhecidos sem migração dos WAVs',()=>{
  assert.deepEqual(CRASH_STOPS.map(p=>p.id),['crashStop','crashStop2','crashStop3']);
  assert.equal(PARTS.find(p=>p.id==='aEntry').group,'entradas');
  assert.equal(PARTS.find(p=>p.id==='crashStop').group,'crashstops');
  assert.match(app,/\['loopcrash','Loop \+ Crash'/);assert.match(app,/\['crash','Crash'/);
  assert.match(app,/editorSection\(song, 'crashstops', 'Crashes adicionais'/);
  assert.match(app,/crash-stop-pad/);
  assert.match(app,/CRASH_STOPS\.map\(p=>\['crash:'\+p\.id,'Acionar '/);
});
test('V20: importação inteligente antiga de Crash ainda encontra os 3 slots',()=>{
  assert.equal(suggestSlot('Crash_Final.wav'),'crashStop');
  assert.equal(suggestSlot('Crash_Final_2.wav'),'crashStop2');
  assert.equal(suggestSlot('Bumbo_Prato_3.wav'),'crashStop3');
  assert.equal(suggestSlot('Parte_A_com_crash.wav'),'aEntry');
  assert.equal(suggestSlot('Refrão_Entrada_Crash.wav'),'chorusEntry');
});
test('V20: Crash se soma ao loop no próximo tempo 1 e preserva a cauda inteira',async()=>{
  const saved=globalThis.window;globalThis.window={AudioContext:FakeContext};
  try{
    const p=setup();await p.start();p.ctx.currentTime=p.epoch+p.bar+.22;
    const expected=p.epoch+p.bar*2;
    assert.equal(p.go('crashStop'),true,'pedal antigo continua acionando');
    assert.equal(p.pending,null,'crash NÃO vira troca nem encerra');
    const blast=p.overlays.find(s=>s.key==='crashStop');
    assert.ok(blast);assert.equal(blast.source.loop,false);
    assert.ok(Math.abs(blast.at-expected)<.0001);
    assert.ok(Math.abs(blast.end-(expected+6.25))<.0001);
    assert.equal(p.go('b'),true,'pode continuar tocando e trocar Parte B');
    p.ctx.currentTime=expected+4.3;
    assert.equal(p.summary().running,true);
    assert.equal(p.summary().active,'b');
    assert.ok(p.summary().crashPlaying.includes('crashStop'));
    p.ctx.currentTime=expected+6.3;
    assert.equal(p.summary().running,true,'loop continua depois da cauda');
    assert.ok(!p.summary().crashPlaying.includes('crashStop'));
  } finally{globalThis.window=saved;}
});
test('V20: crash adicional não apaga virada pendente nem altera posição da música',async()=>{
  const saved=globalThis.window;globalThis.window={AudioContext:FakeContext};
  try{
    const p=setup();await p.start();p.ctx.currentTime=p.epoch+p.bar+.15;
    assert.equal(p.go('b'),true);
    const pending=p.pending;
    assert.equal(p.crash('crashStop2'),true);
    assert.equal(p.pending,pending);
    assert.ok(p.overlays[0].at>p.ctx.currentTime);
    p.stop();assert.equal(p.overlays.length,0);
    assert.equal(p.overlays.length,0);
  }finally{globalThis.window=saved;}
});
test('V20: controles visuais e sincronização do crash preservam a lateral',()=>{
  assert.match(app,/v15-primary-nav/);assert.match(app,/class="v15-sync-status"/);
  assert.match(app,/<span class="v15-sync-status" id="sync-label"/);
  assert.doesNotMatch(app,/<button class="nav-link" data-action="sync" title="Estado da sincronização"/);
  assert.match(css,/\.v12-sidebar \.v12-group,\.v12-sidebar \.v15-primary-nav/);
  assert.match(css,/\.v15-sync-status/);
});
