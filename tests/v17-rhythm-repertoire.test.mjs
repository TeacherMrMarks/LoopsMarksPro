import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cleanLibrary, repertoireEntries } from '../dist/library-model.js';
import { bpmRange } from '../dist/audio.js';
const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
test('V17: editor diferencia ritmo reutilizável e música sem alterar os dados antigos',()=>{
  assert.match(app,/songKind\(song\)==='rhythm'\?'Nome do ritmo':'Nome da música'/);
  assert.match(app,/songKind\(song\)==='rhythm'\?'Estilo musical':'Momento'/);
  assert.match(app,/field\('bpm', 'BPM original'/);
  assert.match(app,/METERS\.map\(meter/);
});
test('V17: repertório cria entrada com nome de música e BPM independente do ritmo',()=>{
  const rhythm={id:'rhythm',name:'Balada Pop',kind:'rhythm',bpm:82};
  const clean=cleanLibrary({repertoires:[{id:'rep',name:'Show',items:[{songId:'rhythm',title:'Minha Canção',bpm:76}]}]});
  const [item]=repertoireEntries(clean.repertoires[0],[rhythm]);
  assert.equal(item.title,'Minha Canção');
  assert.equal(item.bpm,76);
  assert.equal(item.song.bpm,82);
  assert.deepEqual(bpmRange(rhythm.bpm),[72,92]);
  assert.match(app,/get\('#rep-add-bpm'\)/);
  assert.match(app,/songKind\(source\)==='rhythm'&&!title/);
  assert.match(app,/const \[min,max\]=bpmRange\(source\.bpm\)/);
  assert.match(app,/selectLive\(repertoireSong\(entry,rep\.id\),tempo\)/);
});
test('V17: versão e publicador permanecem configurados',()=>{
  assert.match(app,/const APP_VERSION = 'V36'/);
  assert.match(readFileSync(new URL('../netlify.toml',import.meta.url),'utf8'),/publish = "dist"/);
});
