import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {firstPlayablePart,newSong} from '../dist/data.js';
const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const manifest=JSON.parse(readFileSync(new URL('../dist/manifest.webmanifest',import.meta.url),'utf8'));

test('V9 mantém Parte A nos metadados atuais e não reverte para cache offline antigo',()=>{
 assert.match(app,/Não exibir metadados antigos do cache offline/);
 assert.doesNotMatch(app,/return saved;\n  return song;/);
 const song=newSong();song.parts.a={path:'wav-a',bars:1};song.parts.chorus={path:'wav-r',bars:1};
 assert.equal(firstPlayablePart(song),'a');
});
test('V9 busca os WAVs faltantes na nuvem antes de preparar áudio',()=>{
 assert.match(app,/await current\.download\(shown/);
 assert.match(app,/Baixando WAVs/);
 assert.match(app,/await player\.prepare\(shown/);
});
test('V9 Ouvir é separado de Trocar e não altera a música',()=>{
 assert.match(app,/button\('preview', 'Ouvir'/);
 assert.match(app,/button\('browse', audio \? 'Trocar' : 'Importar'/);
 assert.match(app,/const meta = state\.admin\?\.parts\?\.\[part\]/);
 assert.match(app,/source\.start\(\)/);
});
test('V9 link de músico não inclui central administrativa nem cadastro',()=>{
 assert.equal(manifest.start_url,'./?modo=musico');
 assert.match(app,/url\.search = '\?modo=musico'/);
 assert.match(app,/if \(musicianLink && view !== 'live'\) return/);
 assert.match(app,/musicianLink \? '' : '<button class="nav-link" data-action="admin"/);
 assert.match(app,/musicianLink \? '' : button\('admin', 'Completar cadastro'/);
});
