import assert from 'node:assert/strict';
import test from 'node:test';
import {cleanLibrary,validLibrary,repertoireEntries} from '../dist/library-model.js';
import {firstPlayablePart,playableParts} from '../dist/data.js';
import {Player} from '../dist/audio.js';
import {readFileSync} from 'node:fs';

const uuid='e5a5c8d9-7dc1-43ce-a8f3-a1f82acc8ba1';
const uuid2='e5a5c8d9-7dc1-43ce-a8f3-a1f82acc8ba2';
test('V13: mesmo ritmo pode ter nomes e BPMs distintos no repertório',()=>{
 const source={folders:[],repertoires:[{id:uuid,name:'Casamento',items:[
 {songId:uuid2,title:'Entrada da noiva',bpm:72},{songId:uuid2,title:'Assinaturas',bpm:78}]}]};
 const lib=cleanLibrary(source);assert.equal(validLibrary(lib),true);
 const rows=repertoireEntries(lib.repertoires[0],[{id:uuid2,name:'Balada',kind:'rhythm',bpm:75}]);
 assert.equal(rows[0].title,'Entrada da noiva');assert.equal(rows[1].title,'Assinaturas');
 assert.equal(rows[0].song,rows[1].song);assert.deepEqual(rows.map(x=>x.bpm),[72,78]);
});
test('V13: novos nomes e loops extras integram as partes reproduzíveis',()=>{
 const song={customSections:[{id:'section_aabbccddeeff',label:'Ponte instrumental'}],parts:{section_aabbccddeeff:{path:'dummy',bars:1}}};
 assert.equal(firstPlayablePart(song),'section_aabbccddeeff');
 assert.ok(playableParts(song).some(part=>part.label==='Ponte instrumental'));
});
test('V13: map musical preserva o formato dos arquivos anteriores',()=>{
 const old={parts:{a:{bars:1}},beats:4,bpm:80};
 assert.equal(firstPlayablePart(old),'a');
 const p=new Player();assert.equal(p.loopKeys.has('a'),true);
});
test('V13: layout prevê partes personalizadas, mapa, importação de ZIP e janela com X',()=>{
 const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../dist/styles.css',import.meta.url),'utf8');
 for(const token of ['sequenceEditor(song)','customSectionsEditor(song)','data-rep-title','data-seq-repeats','backup-x','v13-modal-title','map-next'])assert.ok(app.includes(token),token);
 assert.ok(css.includes('#dialog:has(.backup-dialog)'));
});

class FakeParam {cancelScheduledValues(){}setValueAtTime(){}linearRampToValueAtTime(){}setTargetAtTime(){}}
class FakeSource {connect(){return this;}disconnect(){}stop(){}start(at,offset,duration){this.at=at;this.offset=offset;this.duration=duration;}}
class FakeContext {
  currentTime=0;state='running';sampleRate=48000;
  createGain(){return {gain:new FakeParam(),connect(){return this;},disconnect(){}};}
  createBufferSource(){return new FakeSource();}
  addEventListener(){}async resume(){}
}
test('V13: mapa automático agenda a próxima seção no compasso, sem temporizador da interface',async()=>{
  const previous=globalThis.window;globalThis.window={AudioContext:FakeContext};
  try{
    const p=new Player(); const beat=.75,bar=3;
    p.song={kind:'music',name:'Entrada',bpm:80,beats:4,parts:{a:{bars:1},chorus:{bars:1},finish:{bars:1}},
      sequenceMode:'automatic',sequence:[{part:'a',repeats:1,jumpTo:-1},{part:'chorus',repeats:2,jumpTo:-1},{part:'finish',repeats:1,jumpTo:-1}]};
    p.initialPart='a';p.bpm=80;p.beatSeconds=beat;p.bar=bar;p.ready=true;
    p.buffers=new Map(['a','chorus','finish'].map(id=>[id,{buffer:{},beats:4,seconds:bar}]));
    await p.start();
    p.ctx.currentTime=p.epoch+1;
    p.summary();
    assert.equal(p.pending?.dest,'chorus');
    assert.ok(Math.abs(p.pending.entry-(p.epoch+bar))<.001);
    p.ctx.currentTime=p.epoch+bar+.05;p.summary();
    assert.equal(p.sequenceIndex,1);
    p.ctx.currentTime=p.epoch+bar+4;p.summary();
    assert.equal(p.pending?.dest,'finish');
    assert.ok(Math.abs(p.pending.entry-(p.epoch+bar+2*bar))<.001);
  }finally{globalThis.window=previous;}
});
