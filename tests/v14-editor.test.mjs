import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../dist/'+path,import.meta.url),'utf8');
const app=read('app.js'),css=read('styles.css');

test('V14: seis abas visuais isolam as seções do editor sem recriar campos',()=>{
  for(const section of ["'dados','Dados'","'loops','Loops'","'crash','Crash'","'viradas','Viradas'","'mapa','Mapa musical'","'finais','Finais'"])
    assert.ok(app.includes(section),section);
  assert.match(app,/function setupEditorTabs\(\)/);
  assert.match(app,/function showEditorTab\(id, focus=false\)/);
  assert.match(app,/panels\.get\('dados'\)\.append\(intro\)/);
  assert.match(app,/panels\.get\('loops'\)\.append\(toolbar\)/);
  assert.match(app,/panel\.hidden=panel\.dataset\.tab!==id/);
  assert.match(app,/for\(const group of groups\)panels\.get\(editorGroupTab\(group\)\)\.append\(group\)/);
  assert.match(css,/\.v14-editor-tabs/);
});

test('V14: catálogo oferece visão lista e cards, mantendo ações originais',()=>{
  assert.match(app,/data-action=\"catalog-view\"/);
  assert.match(app,/state\.catalogView==='lista'/);
  assert.match(app,/data-action=\"song\"/);
  assert.match(css,/\.v12-catalog-grid\.v14-list/);
});

test('V14 mantém infraestrutura e áudio inalterados em comparação com o pacote base',()=>{
  assert.match(app,/const APP_VERSION = 'V14'/);
  assert.match(app,/await player\.prepare\(shown/);
  assert.match(app,/await current\.download\(shown/);
  assert.match(app,/function copyMobile/);
});
