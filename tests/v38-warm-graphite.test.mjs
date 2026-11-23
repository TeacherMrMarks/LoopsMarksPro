import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = name => readFileSync(new URL('../dist/'+name,import.meta.url),'utf8');

test('V38 ativa a camada Warm Graphite depois dos temas V36/V37, sem remover esses temas',()=>{
 const html=read('index.html'),css=read('v38-warm-graphite.css');
 assert.match(html,/<title>Loops Marks Pro · V38<\/title>/);
 assert.ok(html.indexOf('v36-ui.css') < html.indexOf('v37-light.css'));
 assert.ok(html.indexOf('v37-light.css') < html.indexOf('v38-warm-graphite.css'));
 for (const hex of ['#d7c9c2','#f0e7df','#251f2d','#282630','#a9235a']) assert.ok(css.includes(hex),hex);
 assert.match(css,/\.v11-editor \.editor-group/);
 assert.match(css,/\.v12-sidebar \.nav-link/);
 assert.match(css,/\.stage-deck \.frame/);
 assert.match(css,/\.mixer-channel label/);
 assert.match(css,/\.repertoire-drawer/);
});

test('V38 deixa títulos, abas, campos e menus da Central com pares legíveis',()=>{
 const css=read('v38-warm-graphite.css');
 for (const term of ['.editor-panel-head h2','.v11-editor .field input','.v14-editor-tab[aria-selected="true"]','.v12-editor-intro>summary','.v11-sidebar .nav-link[aria-current="page"]','.sidebar-song-list .item'])
 assert.ok(css.includes(term),term);
 assert.match(css,/\.v11-editor,.v12-shell \.v11-editor \{color:#251f2d;background:#f0e6dd/);
 assert.match(css,/\.v12-sidebar \.v12-group[\s\S]*?color:#f4eaf2;background:#423b4c/);
});

test('V38 preserva altura mínima de toque, seis atalhos e cores individuais de partes',()=>{
 const app=read('app.js'),old=read('v36-ui.css'),css=read('v38-warm-graphite.css'),fit=read('stage-fit.js');
 for(const label of ['Pedal','MIDI','Áudio','Mixer','Tela cheia','Repertório'])assert.ok(old.includes("content:'"+label+"'"));
 assert.match(old,/min-height:48px/);
 assert.match(fit,/Math\.max\(48, Math\.min\(64, fittedHeight\)\)/);
 assert.match(app,/const APP_VERSION = 'V38'/);
 assert.match(app,/stagePartTheme\(part, index\)/);
 assert.match(css,/hsl\(var\(--v36-hue,214\) 54% 33%\)/);
 assert.match(css,/data-part="chorus"/);
});

test('V38 versiona service worker e mantém seu cache de áudio e todos os módulos',()=>{
 const sw=read('sw.js'),html=read('index.html');
 assert.match(sw,/loops-marks-v38-warm-graphite/);
 assert.match(sw,/\.\/v38-warm-graphite\.css/);
 for(const name of ['audio.js','audio-output.js','audio-test.wav','backup.js','data.js','midi.js','mixer.js','preferences.js','stage-fit.js'])
 assert.ok(sw.includes("'./"+name+"'"),name);
 assert.match(sw,/request\.headers\.has\('Range'\)/);
 assert.match(html,/name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/);
});

function luminance(hex){
 const rgb = hex.replace('#','').match(/.{2}/g).map(x=>parseInt(x,16)/255);
 const lin = rgb.map(c=>c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4);
 return lin[0]*0.2126+lin[1]*0.7152+lin[2]*0.0722;
}
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05)}
test('V38 principais pares cromáticos respeitam contraste WCAG AA de 4.5:1',()=>{
 const samples={
  'texto/editor':['#251f2d','#f0e6dd'],
  'texto/campos':['#241f2d','#fbf6f0'],
  'texto/secoes':['#2d2639','#e0d0ca'],
  'navegacao/lateral':['#f0e7ed','#302c37'],
  'navegacao/ativa':['#29223e','#e4dceb'],
  'texto/miudo':['#554a57','#f0e6dd'],
  'letra status':['#fff8fa','#474365'],
  'branco botao iniciar':['#ffffff','#215936'],
  'branco botao refrao':['#ffffff','#a9235a'],
  'texto campos':['#241f2d','#f4ece5'],
 };
 for(const [k,[fg,bg]] of Object.entries(samples))assert.ok(contrast(fg,bg)>=4.5,`${k}: ${contrast(fg,bg).toFixed(2)}`);
});
