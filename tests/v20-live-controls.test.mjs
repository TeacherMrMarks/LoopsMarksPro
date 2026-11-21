import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Player,nextBoundary} from '../dist/audio.js';
import {CRASH_STOPS,PARTS,newSong} from '../dist/data.js';
const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const audio=readFileSync(new URL('../dist/audio.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../dist/styles.css',import.meta.url),'utf8');
class Param{cancelScheduledValues(){}setValueAtTime(){}linearRampToValueAtTime(){}setTargetAtTime(){}}
class Source{
  loop=false;connect(){return this;}disconnect(){}stop(){this.stopped=true;}
  start(at,offset=0,duration){
    for(const n of [at,offset,...(duration===undefined?[]:[duration])]) assert.ok(Number.isFinite(n),'non-finite Web Audio timestamp/duration');
    this.at=at;this.offset=offset;this.duration=duration;
  }
}
class Context{
  currentTime=10;state='running';sampleRate=48000;
  createGain(){return {gain:new Param(),connect(){return this;},disconnect(){}};}
  createBufferSource(){return new Source();}
  async resume(){}
}
function fixture({meter='4/4',beats=4,rate=84,countBars=1,countFileBars=1,intro=false}={}){
  const p=new Player();p.ctx=new Context();p.mix=p.ctx.createGain();p.context=()=>p.ctx;
  p.song={...newSong(),kind:'rhythm',bpm:rate,beats,meter,parts:{},introMode:'once',sequence:[],fillMode:'smart',repeatMode:'direct'};
  p.beatSeconds=60/rate;p.bpm=rate;p.bar=beats*p.beatSeconds;p.initialPart='a';p.ready=true;
  p.loopKeys=new Set(['a','b','chorus']);p.setCountControl(true,countBars);
  p.buffers=new Map([
    ['a',{buffer:{},seconds:p.bar,beats}],
    ['b',{buffer:{},seconds:p.bar,beats}],
    ['chorus',{buffer:{},seconds:p.bar,beats}],
    ['countIntro',{buffer:{},seconds:countFileBars*p.bar,beats:countFileBars*beats}],
    ['crashStop',{buffer:{},seconds:4.15,beats}],
    ['crashStop2',{buffer:{},seconds:2.35,beats}],
    ['crashStop3',{buffer:{},seconds:1.15,beats}],
    ...(intro?[['intro',{buffer:{},seconds:2*p.bar,beats:2*beats}]]:[]),
  ]);
  return p;
}
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);

test('V20: 1 WAV de um compasso toca duas vezes na contagem de 2 compassos',async()=>{
  const p=fixture({beats:3,meter:'3/4',rate:82,countBars:2,countFileBars:1});await p.start();
  assert.deepEqual(p.segments.map(s=>s.key),['countIntro','countIntro','a']);
  const [first,second,music]=p.segments;
  assert.equal(first.source.loop,false);assert.equal(second.source.loop,false);
  close(second.at,first.naturalEnd);close(music.at,second.naturalEnd);
  close(music.at-p.epoch,p.bar*2);
  assert.equal(first.source.duration,p.bar);assert.equal(second.source.duration,p.bar);
});
test('V20: WAV de dois compassos pode executar somente um compasso inicial',async()=>{
  const p=fixture({countBars:1,countFileBars:2});await p.start();
  const [count,music]=p.segments;
  assert.equal(count.key,'countIntro');assert.equal(count.source.duration,p.bar);
  close(music.at,count.naturalEnd);
});
test('V20: WAV de dois compassos toca por inteiro quando seleciona dois',async()=>{
  const p=fixture({countBars:2,countFileBars:2});await p.start();
  assert.deepEqual(p.segments.map(s=>s.key),['countIntro','a']);
  close(p.segments[0].source.duration,2*p.bar);
  close(p.segments[1].at,p.epoch+2*p.bar);
});
test('V20: desligar contagem pula diretamente para Parte B armada no ensaio',async()=>{
  const p=fixture({intro:true});p.setCountControl(false,2);
  assert.equal(p.go('b'),true);await p.start();
  assert.deepEqual(p.segments.map(s=>s.key),['b']);
  close(p.segments[0].at,p.epoch);
});
test('V20: mesmo reinício escolhe Refrão com contagem de 2 compassos ligada',async()=>{
  const p=fixture({countBars:2,intro:true});assert.equal(p.arm('chorus'),true);await p.start();
  assert.deepEqual(p.segments.map(s=>s.key),['countIntro','countIntro','chorus']);
});
test('V20: crashes 1/2/3 atuam juntos, sem silenciar A e sem bloquear B',async()=>{
  const p=fixture();await p.start();p.ctx.currentTime=p.epoch+p.bar+.8;
  const a=p.segments.find(s=>s.key==='a');
  const expected=nextBoundary(p.epoch,p.bar,p.ctx.currentTime);
  for (const part of CRASH_STOPS) assert.equal(p.crash(part.id),true);
  assert.equal(p.overlays.length,3);assert.equal(p.pending,null);
  for (const blast of p.overlays){close(blast.at,expected);assert.equal(blast.source.loop,false);}
  assert.equal(a.end,Infinity);
  assert.equal(p.go('b'),true);assert.equal(p.pending.dest,'b');
  assert.equal(p.crash('crashStop2'),true,'segundo toque no mesmo tempo 1 não duplica');
  assert.equal(p.overlays.length,3);
});
test('V20: trava crash durante contagem de baquetas, só atua com loop musical',async()=>{
  const p=fixture();await p.start();p.ctx.currentTime=p.epoch+.2;
  assert.equal(p.crash('crashStop'),false);assert.equal(p.overlays.length,0);
  p.ctx.currentTime=p.epoch+p.bar+.2;
  assert.equal(p.crash('crashStop'),true);
});
test('V20: não se agenda crash depois do acabamento ou final pendente',async()=>{
  const p=fixture();p.buffers.set('finish',{buffer:{},seconds:3,beats:4});await p.start();
  p.ctx.currentTime=p.epoch+p.bar+.2;
  assert.equal(p.go('finish'),true);
  assert.equal(p.crash('crashStop'),false);
});
test('V20: com compasso 6/8 a sincronização segue seus dois pulsos musicais',async()=>{
  const p=fixture({beats:2,meter:'6/8',rate:80,countBars:2});await p.start();
  close(p.segments.at(-1).at,p.epoch+3);
  p.ctx.currentTime=p.epoch+3.4;
  assert.equal(p.crash('crashStop'),true);
  close(p.overlays[0].at,p.epoch+4.5);
});
test('V20: o comando de crash antigo no pedal continua aceito após troca de semântica',async()=>{
  const p=fixture();await p.start();p.ctx.currentTime=p.epoch+p.bar+.1;
  assert.equal(p.go('crashStop'),true);
  assert.equal(p.pending,null);assert.equal(p.overlays.length,1);
});
test('V20: compasso e botão de contagem no Live, com estado salvo só no aparelho',()=>{
  assert.match(app,/data-action="toggle-live-count"/);
  assert.match(app,/id="live-count-bars"/);
  assert.match(app,/updateLiveCount\(state.liveCountEnabled/);
  assert.match(app,/loops-v20-count-/);
  assert.match(app,/state.liveCountEnabled/);
  assert.match(css,/count-live-toggle/);
  assert.match(audio,/source\.start\(at\); \/\/ WAV completo/);
  assert.match(app,/data-action="crash"/);
  assert.match(app,/Acabamento ou Final/);
});
