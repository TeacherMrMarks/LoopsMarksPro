import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base = new URL('../dist/', import.meta.url);
const read = f => readFileSync(new URL(f,base),'utf8');
const app = read('app.js'),css = read('styles.css'),manifest=JSON.parse(read('manifest.webmanifest'));

test('V10: palco separado sem sidebar de cadastro, com marca central e gaveta de repertório',()=>{
  assert.match(app,/if \(live\) \{\s+return '<div class="stage-shell/);
  assert.match(app,/brand\('stage-brand'\)/);
  assert.match(app,/id="live-drawer" role="dialog"/);
  assert.match(app,/function toggleLibrary\(open\)/);
  assert.match(app,/if \(musicianLink && view !== 'live'\) return/);
  assert.match(css,/\.stage-topbar \.stage-brand/);
  assert.match(css,/\.stage-deck \.pads/);
  assert.match(css,/\.repertoire-drawer \.items \{align-content:start/);
});

test('V10: visor indica parte, modo e proxima transicao sem recriar o player',()=>{
  assert.match(app,/id="stage-active"/);
  assert.match(app,/id="stage-mode"/);
  assert.match(app,/id="stage-next"/);
  assert.match(app,/playing\.entryAttack \? 'Entrada com crash'/);
  assert.match(app,/playing\.next \? 'PRÓXIMO/);
  assert.match(app,/textContent !== mode/);
});

test('V10: configurações agrupam backup, link, conta e sair da central',()=>{
  const body=app.slice(app.indexOf('function settingsMenu('),app.indexOf('function shell()'));
  for(const key of ['settings-account', "'backup'", "'link'", "'logout'"]) assert.ok(body.includes(key));
  assert.match(app,/button\('new', 'Nova música'/);
  assert.doesNotMatch(app,/button\('backup', 'Backup \/ Restaurar'/);
  assert.doesNotMatch(app,/button\('link', 'Gerar link do aplicativo', 'link', 'ghost'\) \+ '<\/div>'/);
});

test('V10: preview e link oficial separados; app iPhone em tela cheia e offline',()=>{
  assert.match(app,/const preview = location\.hostname\.match/);
  assert.match(app,/stable\.hostname = preview\[1\]/);
  assert.match(app,/Copiar link de teste/);
  assert.match(app,/await current\.download\(shown/);
  assert.match(app,/await player\.prepare\(shown/);
  assert.equal(manifest.start_url, './?modo=musico');
  assert.equal(manifest.display,'standalone');
  assert.match(read('index.html'),/apple-mobile-web-app-status-bar-style/);
  assert.match(read('sw.js'),/cache\.match/);
});
