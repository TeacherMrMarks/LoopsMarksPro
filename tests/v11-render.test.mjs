import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as data from '../dist/data.js';
import * as lib from '../dist/library-model.js';
import * as meter from '../dist/meter.js';
import * as midi from '../dist/midi.js';
import {Player,bpmRange} from '../dist/audio.js';
const source=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8')
  .replace(/^import .*;\n/gm,'').split("document.addEventListener('keydown',")[0];
function context(mode='central'){
  const root={querySelector:()=>null,addEventListener:()=>{}};
  const sandbox={
    ...data,...lib,...meter,...midi,Player,bpmRange,
    Cloud:class {enabled=true;session(){return {id:'u1',email:'editor@example.com'}}},
    location:{href:'https://loops.test/?modo='+mode},
    URL,crypto,structuredClone,
    document:{querySelector:()=>root},window:{LOOPS_CONFIG:{}},navigator:{onLine:true},
    console,setTimeout,clearTimeout,
    localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},
  };
  vm.createContext(sandbox);
  vm.runInContext(source,sandbox);
  return sandbox;
}
const song=()=>{const x=data.newSong();x.name='Entrada da Noiva';x.occasion='Casamento';x.bpm=75;return x;};
test('V12 renderiza gerenciamento recolhível e editor amplo sem cards repetidos',()=>{
 const ctx=context();
 const html=vm.runInContext('shell()',ctx);
 assert.match(html,/Central Administrativa/);
 assert.match(html,/v12-subnav/);
 assert.match(html,/toggle-management/);
 assert.match(html,/Gerenciar pastas/);
 assert.match(html,/Repertórios/);
 assert.doesNotMatch(html,/admin-summary/);
});
test('V12 editor recolhe identificação e mantém as seções de viradas',()=>{
 const ctx=context(),s=song();
 ctx.testSong=s;
 const html=vm.runInContext('state.admin=testSong;state.songs=[testSong];adminView()',ctx);
 assert.match(html,/v12-editor-intro/);
 assert.match(html,/Tipo de cadastro/);
 assert.match(html,/Música específica/);
 assert.match(html,/Ritmo reutilizável/);
 assert.match(html,/Loop \+ Crash/);
 assert.match(html,/data-file="crashStop"/);
 assert.match(html,/Viradas automáticas/);
 assert.match(html,/Mapa de transições/);
});
test('V12 repertório renderiza itens mistos ordenados e BPM individual',()=>{
 const ctx=context();const music=song(),rhythm={...data.newSong(),kind:'rhythm',name:'Rock 4\/4',bpm:105};
 ctx.sampleSongs=[music,rhythm];
 ctx.metadata={folders:[{id:crypto.randomUUID(),name:'Casamentos',kind:'music'}],
  repertoires:[{id:crypto.randomUUID(),name:'Cerimônia',date:'2026-11-21',items:[{songId:music.id,bpm:70},{songId:rhythm.id,bpm:103}]}]};
 const html=vm.runInContext('state.songs=sampleSongs;state.libraryData=metadata;state.adminPanel="repertoires";adminView()',ctx);
 assert.match(html,/Cerimônia/);assert.match(html,/Entrada da Noiva/);assert.match(html,/Rock 4/);assert.match(html,/Ordem de execução/);
});
test('V12 modo músico exibe somente a execução e acesso à gaveta, sem editor',()=>{
 const ctx=context('musico'),s=song();s.parts.a={path:'u/x/y.wav',bars:1,lengthBeats:4};ctx.testSong=s;
 const html=vm.runInContext('state.selected=testSong;state.songs=[testSong];state.bpm=75;shell()',ctx);
 assert.match(html,/stage-shell/);assert.match(html,/repertoire-toggle/);
 assert.match(html,/PARTE EM EXECUÇÃO/);assert.match(html,/id="play-btn"/);
 assert.doesNotMatch(html,/class="v11-editor"|data-action="browse"|data-action="new"/);
});

test('V16 renderiza 3/4 e 6/8 com opções e unidade de BPM apropriada',()=>{
 const ctx=context(),balada=song();balada.meter='3/4';balada.beats=3;ctx.testSong=balada;
 let html=vm.runInContext('state.admin=testSong;editor()',ctx);
 assert.match(html,/Fórmula de compasso/);
 assert.match(html,/value="3\/4" selected/);
 assert.match(html,/valsa/);
 balada.meter='6/8';balada.beats=2;html=vm.runInContext('state.admin=testSong;editor()',ctx);
 assert.match(html,/value="6\/8" selected/);
 assert.match(html,/semínima pontuada/);
 assert.match(html,/6\/8 · BPM de semínima \(DAW\)/);
 balada.beatUnit='quarter';balada.beats=3;html=vm.runInContext('state.admin=testSong;editor()',ctx);
 assert.match(html,/value="6\/8@quarter" selected/);
});
