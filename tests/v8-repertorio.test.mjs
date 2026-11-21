import test from 'node:test';
import assert from 'node:assert/strict';
import { liveCatalog, firstPlayablePart, newSong } from '../dist/data.js';
import { Player } from '../dist/audio.js';
import { readFileSync } from 'node:fs';

class Param { cancelScheduledValues() {} setValueAtTime() {} linearRampToValueAtTime() {} }
class Source { connect(){return this;} disconnect(){} start(at){this.at=at;} stop(){} }
class Context {
  constructor(){this.currentTime=0; this.state='running'; globalThis.testContext=this;}
  createGain(){return {gain:new Param(),connect(){return this;},disconnect(){}};}
  createBufferSource(){return new Source();}
  addEventListener(){}
  async resume(){}
}
globalThis.window={AudioContext:Context};

function song(part) {const s=newSong(); s.name='Música de casamento';if(part)s.parts[part]={lengthBeats:4,bars:1};return s;}

test('V8 mantém músicas com nome no repertório mesmo sem WAV ou sem Parte A',()=>{
 const a=song();const refrain=song('chorus');const withA=song('a');
 const deleted=song('b');deleted.deleted=true;
 const result=liveCatalog([a,refrain,withA,deleted]);
 assert.deepEqual(result,[a,refrain,withA]);
 assert.equal(firstPlayablePart(a),null);
 assert.equal(firstPlayablePart(refrain),'chorus');
 assert.equal(firstPlayablePart(withA),'a');
});

test('V8 escolhe a primeira parte contínua e pode iniciar pelo Refrão sem Parte A',async()=>{
 const music=song('chorus');
 const p=new Player();p.song=music;p.initialPart=firstPlayablePart(music);
 p.bpm=80;p.beatSeconds=0.75;p.bar=3;p.ready=true;
 p.buffers=new Map([['chorus',{buffer:{},seconds:3,beats:4}]]);
 await p.start();
 assert.equal(p.segments[0].key,'chorus');
 assert.equal(p.segments[0].source.loop,true);
 assert.equal(p.running,true);
 p.stop();
});

test('V8 não deixa música incompleta desaparecer e informa o WAV faltante',()=>{
 const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
 assert.match(app,/const rows = liveCatalog\(state.songs\)/);
 assert.match(app,/Falta loop contínuo/);
 assert.match(app,/Cadastro encontrado/);
 assert.doesNotMatch(app,/rows\.filter\(song => song\.name && song\.parts\?\.a\)/);
});
