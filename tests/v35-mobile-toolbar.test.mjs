import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {allowedStageAction} from '../dist/access-mode.js';
const read=f=>readFileSync(new URL('../dist/'+f,import.meta.url),'utf8');
test('V35 stage renders six existing authorized controls independent of admin access',()=>{
 const app=read('app.js'),shell=app.slice(app.indexOf('function shell()'),app.indexOf('function loginView()'));
 for(const action of ['pedal-setup','audio-setup','mixer-open','stage-fullscreen','open-library']){assert.ok(shell.includes("iconButton('"+action+"'"));assert.ok(allowedStageAction(action));}
 assert.ok(shell.includes('midiIcon()'));assert.ok(allowedStageAction('midi-setup'));
 assert.match(shell,/restrictedStage\(\)\?'<span class="stage-top-left"/);assert.equal(allowedStageAction('admin'),false);
});
test('V35 narrow stage separates brand and all six shortcuts, respects safe area and positions mixer below toolbar',()=>{
 const css=read('styles.css').split('/* V35')[1];assert.match(css,/env\(safe-area-inset-top,0px\)/);assert.match(css,/grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);assert.match(css,/grid-column:1\/-1;grid-row:2/);assert.match(css,/\.stage-tools \.icon-btn\{width:100%;min-width:0;height:44px/);assert.match(css,/\.stage-shell ~ \.mixer-panel/);assert.match(css,/max-height:calc\(100dvh/);
});
test('V35 no duplicated count label while queued destination remains independently visible',()=>{
 const app=read('app.js');assert.match(app,/playing\.active === 'countIntro' \? '' : playing\.active === 'intro'/);assert.match(app,/modeNode\.hidden=!mode/);assert.match(app,/nextNode\.hidden=!next/);assert.match(app,/get\('\.stage-status-side'\)\.hidden=!mode&&!next/);assert.match(read('styles.css'),/\.stage-status-side span,\.stage-deck \.stage-status-side small\{white-space:normal;overflow-wrap:anywhere/);
});
