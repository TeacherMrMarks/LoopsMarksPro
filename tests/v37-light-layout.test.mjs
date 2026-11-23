import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const dist = name => readFileSync(new URL('../dist/'+name, import.meta.url),'utf8');

test('V37 serve a paleta clara depois das regras V36 sem alterar estrutura do HTML',()=>{
  const html = dist('index.html'),css = dist('v37-light.css');
  assert.ok(html.indexOf('v36-ui.css') >= 0 && html.indexOf('v37-light.css') > html.indexOf('v36-ui.css'));
  assert.match(html,/<title>Loops Marks Pro · V37<\/title>/);
  assert.match(css,/color-scheme:light/);
  assert.match(css,/--bg:#f3f7ff/);
  assert.match(css,/--card:#ffffff/);
  assert.match(css,/\.stage-topbar \{background:radial-gradient/);
  assert.match(css,/\.stage-deck \.frame \{color:var\(--text\);background:linear-gradient/);
});

test('V37 diferencia as partes sem substituir os data-actions, nem a estrutura dos pads',()=>{
  const app = dist('app.js'),css=dist('v37-light.css');
  assert.match(app,/const APP_VERSION = 'V37'/);
  assert.match(app,/const stagePartHues = \[216, 271, 25, 176, 43/);
  assert.match(app,/stagePartTheme\(part, index\)/);
  assert.match(css,/data-part="chorus"/);
  assert.match(css,/#ff178f/);
  assert.match(css,/linear-gradient\(#15b832,#078e21\)/);
  assert.match(css,/linear-gradient\(#fa4547,#cb131d\)/);
});

test('V37 mantém ferramentas, adaptação a toque, mixer e gaveta mobile da V36',()=>{
  const app=dist('app.js'),css=dist('v36-ui.css'),fit=dist('stage-fit.js');
  assert.match(css,/grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
  for(const item of ['Pedal','MIDI','Áudio','Mixer','Tela cheia','Repertório'])
    assert.ok(css.includes("content:'"+item+"'"));
  assert.match(css,/min-height:48px/);
  assert.match(fit,/Math\.max\(48, Math\.min\(64, fittedHeight\)\)/);
  for(const action of ['pedal-setup','audio-setup','mixer-open','stage-fullscreen','open-library'])
    assert.ok(app.includes("iconButton('"+action+"'"));
  assert.match(app,/midiIcon\(\)/);
});

test('V37 worker pré-cache inclui estilo novo e manifest da identidade clara',()=>{
  const sw=dist('sw.js'),manifest=JSON.parse(dist('manifest.webmanifest'));
  assert.match(sw,/v36-ui\.css', '\.\/v37-light\.css/);
  assert.match(sw,/loops-marks-v37-light-studio/);
  assert.equal(manifest.background_color,'#f3f7ff');
  assert.equal(manifest.theme_color,'#1359c9');
  assert.match(sw,/url\.pathname === new URL\('\.\/audio-test\.wav'/);
});

test('V37 só muda cores do canvas, preservando o desenho/ritmo de waveform',()=>{
  const app=dist('app.js');
  assert.ok(app.includes("? '#6127d3' :"));
  assert.match(app,/context\.fillRect\(i \* step \+ 0\.5/);
  assert.match(app,/context\.fillRect\(Math\.min\(width - 1, progress \* width\)/);
});
