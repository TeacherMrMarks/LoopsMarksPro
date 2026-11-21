import test from 'node:test'; import assert from 'node:assert/strict'; import { readFileSync } from 'node:fs';
const data=readFileSync('dist/data.js','utf8'); const app=readFileSync('dist/app.js','utf8');
test('teste não exige login',()=>{assert.match(data,/enabled = false/);assert.match(data,/MODO TESTE/);});
test('teste usa banco isolado',()=>{assert.match(data,/loops-marks-v4-teste-data/);assert.match(data,/v4-teste-local/);});
test('bloqueio de nuvem',()=>{assert.match(data,/Este modo teste não acessa a nuvem/);});
test('versão e aviso de teste',()=>{assert.match(app,/APP_VERSION = 'V4'/);assert.match(app,/test-banner/);});
