import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base=new URL('../dist/',import.meta.url);
const app=readFileSync(new URL('app.js',base),'utf8');
const css=readFileSync(new URL('styles.css',base),'utf8');
const data=readFileSync(new URL('data.js',base),'utf8');
const worker=readFileSync(new URL('sw.js',base),'utf8');

test('V12: menus compactos, bibliotecas na área principal e configurações flutuantes',()=>{
  for(const code of ['toggle-management','collapse-sidebar','v12-catalog-grid','openSettingsModal','v12-editor-intro'])
    assert.ok(app.includes(code));
  assert.match(app,/id="v12-editor-intro"/);
  assert.match(css,/\.v12-collapsed/);
  assert.match(css,/#dialog:has\(\.v12-settings-dialog\)/);
  assert.doesNotMatch(app,/sidebar-collections/);
});
test('V12: seis comandos HID personalizáveis com captura, proteção e memória offline',()=>{
  for(const code of ['v12-pedal-row','state.pedalLearn','event.code','pedalLastAt','localStorage.setItem(\'loops-v12-pedal-map\''])
    assert.ok(app.includes(code));
  assert.match(app,/Array.from\(\{length:6\}/);
  assert.match(app,/pedal-setup/);
  assert.match(app,/event.repeat/);
});
test('V12: revogação remota, acesso read-only e atualização sem travar playback',()=>{
  assert.match(app,/linkCreate\(\)/);
  assert.match(app,/linkRevoke\(\)/);
  assert.match(data,/async initializeMusician\(/);
  assert.match(data,/this\.musicianRequest\(op/);
  assert.match(data,/48\*3600000/);
  assert.match(worker,/await fetch\(request\)/);
  assert.match(worker,/skipWaiting/);
});
