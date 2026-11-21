import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { hasAudioPart, CRASH_STOPS, newSong } from '../dist/data.js';

const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const groupFunction=app.match(/function editorGroupTab\(element\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(groupFunction,'editorGroupTab function must exist');
const classify=runInNewContext('('+groupFunction+')');
const tabFor=(title)=>classify({querySelector:()=>({textContent:title})});

test('V21: aba Crash contém seção Crashes adicionais, sem cair nos Loops',()=>{
  assert.equal(tabFor('Crashes adicionais'),'crash');
  assert.equal(tabFor('Crash'),'crash');
  assert.equal(tabFor('Loops contínuos e introduções'),'loops');
  assert.equal(tabFor('Loop + Crash · Entradas por parte (opcional)'),'loopcrash');
  assert.equal(tabFor('Viradas manuais'),'viradas');
  assert.equal(tabFor('Acabamento e final'),'finais');
  assert.match(app,/editorSection\(song, 'crashstops', 'Crashes adicionais'/);
  assert.match(app,/panels\.get\(editorGroupTab\(group\)\)\.append\(group\)/);
});

test('V21: Live não lista crashes vazios, mesmo que tenha registro sem arquivo',()=>{
  const song=newSong();
  song.parts.crashStop={name:'',bars:1};
  song.parts.crashStop2={name:'meu_ataque.wav',bars:1};
  assert.deepEqual(CRASH_STOPS.filter(p=>hasAudioPart(song,p.id)).map(p=>p.id),[]);
  song.parts.crashStop2.path='audio/real-crash.wav';
  assert.deepEqual(CRASH_STOPS.filter(p=>hasAudioPart(song,p.id)).map(p=>p.id),['crashStop2']);
  delete song.parts.crashStop2;
  assert.deepEqual(CRASH_STOPS.filter(p=>hasAudioPart(song,p.id)).map(p=>p.id),[]);
  assert.match(app,/const crashStops = CRASH_STOPS\.filter\(part => hasAudioPart\(song, part\.id\)\)/);
});

test('V21: três slots permanecem acessíveis para cadastrar e excluir WAV sem perda de dados',()=>{
  assert.deepEqual(CRASH_STOPS.map(part=>part.id),['crashStop','crashStop2','crashStop3']);
  assert.match(app,/button\('reuse-wav', 'Reutilizar'/);
  assert.match(app,/button\('browse', audio \? 'Trocar' : 'Importar'/);
  assert.match(app,/iconButton\('remove-file', 'Remover WAV de '/);
  assert.match(app,/data-action="crash" data-part="/);
});

test('V21: conteúdo de demonstração pode usar áudio simulado sem exigir path',()=>{
  const song={...newSong(),demo:true};
  song.parts.crashStop={name:'crashStop.wav',bars:1};
  assert.equal(hasAudioPart(song,'crashStop'),true);
  assert.equal(hasAudioPart({...song,demo:false},'crashStop'),false);
});
