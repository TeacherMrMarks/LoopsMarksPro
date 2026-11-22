import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base=new URL('../dist/',import.meta.url);
const read=file=>readFileSync(new URL(file,base),'utf8');
const app=read('app.js'),css=read('styles.css'),manifest=JSON.parse(read('manifest.webmanifest'));
test('V11 mantém palco independente, marca central e gaveta do repertório',()=>{
  assert.match(app,/if\(live\) return '<div class="stage-shell/);
  assert.match(app,/brand\('stage-brand'\)/);
  assert.match(app,/id="live-drawer" role="dialog"/);
  assert.match(app,/function toggleLibrary\(open\)/);
  assert.match(app,/if \(musicianLink && view !== 'live'\) return/);
  assert.match(css,/\.stage-topbar \.stage-brand/);
});
test('V11 indicador mostra seção, crash, modo e fila de transição',()=>{
 for(const id of ['stage-active','stage-mode','stage-next']) assert.ok(app.includes('id="'+id+'"'));
 assert.match(app,/playing\.entryAttack \? 'Entrada com crash'/);
 assert.match(app,/playing\.next \? 'PRÓXIMO/);
});
test('V12 central integra biblioteca ampla e configuração modal',()=>{
 assert.match(app,/function adminSidebar/);
 assert.match(app,/function foldersPanel/);
 assert.match(app,/function repertoiresPanel/);
 assert.match(app,/v12-catalog-grid/);
 assert.match(app,/function openSettingsModal/);
 assert.doesNotMatch(app,/class="admin-summary"/);
 assert.match(app,/settingsMenu\(user\)/);
 assert.match(app,/function copyMobile/);
 assert.doesNotMatch(app,/Copiar app oficial/);
 assert.match(app,/Gerenciar link do músico/);
});
test('V11 preserva instalação PWA, Modo Live offline e nome da versão',()=>{
 assert.equal(manifest.start_url,'./?modo=musico');
 assert.equal(manifest.display,'standalone');
 assert.match(read('index.html'),/V27/);
 assert.match(read('sw.js'),/cache\.match/);
 assert.match(app,/await current\.download\(state\.songs\.find\(s=>s\.id===shown\.id\)\|\|shown/);
 assert.match(app,/await player\.prepare\(shown/);
});
