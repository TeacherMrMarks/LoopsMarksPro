import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Player} from '../dist/audio.js';
import {firstPlayablePart, PLAY_PARTS, Cloud} from '../dist/data.js';

class Param {cancelScheduledValues(){} setValueAtTime(){} linearRampToValueAtTime(){} setTargetAtTime(){}}
class Source {
  loop=false;
  connect(){return this;}
  disconnect(){}
  stop(){this.stopped=true;}
  start(at,offset=0,duration){
    if (!Number.isFinite(at) || !Number.isFinite(offset) || (duration!==undefined&&!Number.isFinite(duration)))
      throw new Error('The provided double value is non-finite.');
    this.at=at;this.offset=offset;this.duration=duration;
  }
}
class Context {
  currentTime=8;state='running';sampleRate=48000;
  createGain(){return {gain:new Param(),connect(){return this;},disconnect(){}};}
  createBufferSource(){return new Source();}
  async resume(){}
}
function player({count=true,intro=true,repeat=false,fill=false}={}) {
  const p=new Player(()=>{});
  p.ctx=new Context();p.mix=p.ctx.createGain();p.context=()=>p.ctx;
  p.song={kind:'rhythm',bpm:80,beats:3,parts:{},introMode:repeat?'repeat':'once',countIntroEnabled:true,sequence:[],repeatMode:'direct',fillMode:'smart'};
  p.bpm=80;p.beatSeconds=.75;p.bar=2.25;p.ready=true;p.initialPart='a';
  p.buffers=new Map([
    ['a',{buffer:{},beats:3,seconds:2.25}],
    ['b',{buffer:{},beats:3,seconds:2.25}],
    ['chorus',{buffer:{},beats:3,seconds:2.25}],
    ...(count?[['countIntro',{buffer:{},beats:3,seconds:2.25}]]:[]),
    ...(intro?[['intro',{buffer:{},beats:6,seconds:4.5}]]:[]),
    ...(fill?[['fillA',{buffer:{},beats:3,seconds:2.25}]]:[]),
  ]);
  p.loopKeys=new Set(['a','b','chorus',...(repeat?['intro']:[])]);
  return p;
}
function byKey(p,key){return p.segments.find(s=>s.key===key);}
const approx=(a,b)=>assert.ok(Math.abs(a-b)<0.00001,`${a} != ${b}`);

test('V19: contagem é um-shot antes da introdução 4/8 compassos, sem source.start(Infinity)',async()=>{
 const p=player({count:true,intro:true});await p.start();
 assert.equal(byKey(p,'countIntro').source.loop,false);
 assert.equal(byKey(p,'intro').source.loop,false);
 approx(byKey(p,'intro').at,byKey(p,'countIntro').naturalEnd);
 approx(byKey(p,'a').at,byKey(p,'intro').naturalEnd);
 assert.ok(p.segments.every(x=>Number.isFinite(x.at)));
 p.ctx.currentTime=byKey(p,'countIntro').at+0.2;
 assert.equal(p.summary().active,'countIntro');
 assert.equal(p.summary().beat,0);
 assert.equal(p.summary().progress>0,true);
});

test('V19: sem introdução musical, contagem passa para Parte A no fim do WAV',async()=>{
 const p=player({count:true,intro:false});await p.start();
 assert.deepEqual(p.segments.map(s=>s.key),['countIntro','a']);
 approx(byKey(p,'a').at,byKey(p,'countIntro').naturalEnd);
});

test('V19: intro repetível continua até comando, mas contagem nunca repete',async()=>{
 const p=player({count:true,intro:true,repeat:true});await p.start();
 assert.equal(byKey(p,'countIntro').source.loop,false);
 assert.equal(byKey(p,'intro').source.loop,true);
 assert.equal(byKey(p,'a'),undefined);
 p.ctx.currentTime=byKey(p,'intro').at+0.1;
 assert.equal(p.summary().active,'intro');
 assert.equal(p.go('b'),true);
 assert.equal(p.pending.dest,'b');
});

test('V19: stop, selecionar refrão e iniciar reexecuta contagem, sem repetir a introdução',async()=>{
 const p=player();await p.start();p.stop();
 assert.equal(p.arm('chorus'),true);
 assert.equal(p.summary().armed,'chorus');
 p.ctx.currentTime=22;await p.start();
 assert.deepEqual(p.segments.map(s=>s.key),['countIntro','chorus']);
 approx(byKey(p,'chorus').at,byKey(p,'countIntro').naturalEnd);
 assert.equal(byKey(p,'intro'),undefined);
});

test('V19: selecionar parte durante o stop funciona sem intro/contagem e com compasso 3/4',async()=>{
 const p=player({count:false,intro:false});
 assert.equal(p.go('b'),true);
 await p.start();
 assert.deepEqual(p.segments.map(s=>s.key),['b']);
 approx(byKey(p,'b').at,p.epoch);
});

test('V19: segundo toque Parte A solicita virada inteligente, mesmo com modo direto',async()=>{
 const p=player({count:false,intro:false,fill:true});await p.start();
 p.ctx.currentTime=p.epoch+p.bar+0.15;
 assert.equal(p.go('a'),true);
 assert.equal(p.pending.dest,'a');
 assert.equal(p.pending.family,'fillA');
 assert.ok(Number.isFinite(p.pending.entry));
 assert.ok(Number.isFinite(p.pending.changeAt));
 assert.ok(p.pending.offsetBeats>=0);
});

test('V19: a contagem não vira parte selecionável nem primeira parte musical',()=>{
 const song={parts:{countIntro:{path:'a'},intro:{path:'b'},b:{path:'c'}}};
 assert.equal(firstPlayablePart(song),'b');
 assert.equal(PLAY_PARTS.some(x=>x.id==='countIntro'||x.id==='intro'),false);
});

test('V19: Cloud.save envia preferências das introduções para o Netlify',async()=>{
 const cloud=Object.create(Cloud.prototype);
 let data;
 cloud.request=async (_,arg)=>{data=JSON.parse(arg.body);return {row_version:5};};
 const version=await cloud.save('owner',{id:'some',revision:4,name:'Teste',occasion:'',bpm:80,beats:3,meter:'3/4',parts:{},kind:'rhythm',introMode:'repeat',countIntroEnabled:false});
 assert.equal(version,5);
 assert.equal(data.content.introMode,'repeat');
 assert.equal(data.content.countIntroEnabled,false);
});

test('V19: interface móvel mostra abertura, permite selecionar parte parada e reutilizar WAV',()=>{
 const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
 const api=readFileSync(new URL('../netlify/functions/loops-api.mjs',import.meta.url),'utf8');
 assert.match(app,/opening-path/);
 assert.match(app,/playing\.armed/);
 assert.match(app,/reuse-wav/);
 assert.match(app,/reuseWavInPart/);
 assert.match(api,/content\.countIntroEnabled/);
 assert.match(api,/content\.introMode/);
});
