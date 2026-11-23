import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fitStageLayout} from '../dist/stage-fit.js';
const read = f => readFileSync(new URL('../dist/'+f,import.meta.url),'utf8');
test('V36 theme is blue/indigo, retains color-coded parts and a magenta chorus',()=>{
 const css=read('v36-ui.css');
 for(const token of ['--bg:#080d22','--green:#a4a2ff','--v36-hue','data-part="chorus"','linear-gradient(145deg,#ed3889','#101735']){
  assert.ok((css+read('index.html')).includes(token),token);
 }
 assert.match(read('app.js'),/stagePartTheme\(part, index\)/);
 assert.match(read('app.js'),/const APP_VERSION = 'V37'/);
});
test('V36 six labeled shortcuts remain visible in single fixed stage viewport with safe area',()=>{
 const css=read('v36-ui.css');
 assert.match(css,/\.stage-shell \{height:100dvh;max-height:100dvh;min-height:0;display:flex;flex-direction:column;overflow:hidden/);
 assert.match(css,/\.stage-topbar \{[\s\S]*?position:relative;top:auto;z-index:30/);
 assert.match(css,/env\(safe-area-inset-top,0px\)/);
 assert.match(css,/grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
 for(const label of ['Pedal','MIDI','Áudio','Mixer','Tela cheia','Repertório'])assert.ok(css.includes("content:'"+label+"'"));
 assert.match(css,/\.stage-main \{flex:1 1 auto;min-height:0;overflow:hidden/);
});
test('V36 groups real stage pads without moving nodes, changing actions or touching sync',()=>{
 const css=read('v36-ui.css'),ui=read('stage-fit.js'),app=read('app.js');
 assert.match(css,/\.stage-deck \.live-sections \.pads,/);
 assert.match(css,/display:contents/);
 assert.match(css,/height:var\(--v36-pad-height,52px\);min-height:48px/);
 assert.match(ui,/Math\.max\(48, Math\.min\(64, fittedHeight\)\)/);
 assert.match(ui,/Math\.min\(6, Math\.floor/);
 assert.doesNotMatch(ui.replace(/\/\/[^\n]*/g,''),/localStorage|sessionStorage|IndexedDB|indexedDB|fetch\(|\.play\(|\.stop\(|MIDI|\.save\(/i);
 assert.match(app,/mountStageFit\(app\.querySelector\('\.stage-shell'\)\)/);
});
test('V36 fit algorithm chooses 5 columns for phone and never goes below 48px',()=>{
 const styles=new Map();
 const pads=Array.from({length:27},()=>({hidden:false,closest(){return null;}}));
 const panel={clientWidth:392,clientHeight:550,querySelectorAll(sel){return sel==='button.pad'?pads:[];}};
 const stage={isConnected:true,querySelector:()=>panel,style:{setProperty:(k,v)=>styles.set(k,v)},dataset:{}};
 fitStageLayout(stage);
 assert.equal(styles.get('--v36-columns'),'5');
 assert.ok(parseFloat(styles.get('--v36-pad-height'))>=48);
 panel.clientHeight=150;fitStageLayout(stage);
 assert.equal(styles.get('--v36-pad-height'),'48px');
 assert.equal(stage.dataset.v36Overflow,'true');
});
test('V36 original motor, backup, data, output, MIDI and cloud functions unmodified',()=>{
 const sha={
  'audio.js':'cc4a602f3c2784800681c497a8700f5865ba0ac7a96f08d18c4b2190dcbcc107',
  'audio-output.js':'6d0bcb456b1ed5f634f5566c9e7baba2da750f7ae47f2d3539af8e3024d8cd41',
  'backup.js':'a0746e7c57fc1910a318d8e38d2df336b65acee33bd6d7bb19a6226e4416791e',
  'data.js':'4b3e6f06a529791d82c07102017a5b057c05dc60d0eff13a9f6fac2660ca8673',
  'midi.js':'8591e4e8c1bd9fe50741c687daec9a406d5b68d225e60dfb679d90af8e04814a',
  'preferences.js':'1b7417183dab2e9fb974e6f9c9f635e55a1cf727eaec268a2bd7c1c4eda8684d',
  'mixer.js':'08028a9f677c906b4af2694976dd63809eeae5ffa206ed1b1b921206e1b5870b',
 };
 for(const [f,hash] of Object.entries(sha))assert.equal(createHash('sha256').update(read(f)).digest('hex'),hash,f);
});
