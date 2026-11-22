import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { hasAudioPart, preparedCrashParts, crashSignature, audioEntries, Repository } from '../dist/data.js';
const wav = name => ({path:`owner/song/${name}.wav`,name:`${name}.wav`,bars:1});
const song = parts => ({id:'song',parts,edit:'same-edit',revision:1});
const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const ids=parts=>parts.map(p=>p.id);

test('V23: empty or malformed crash records are not treated as WAVs',()=>{
 const s=song({a:wav('a'),crashStop:{path:' ',name:'fake.wav'},crashStop2:{path:17},crashStop3:{name:'file.wav'}});
 assert.equal(hasAudioPart(s,'crashStop'),false);
 assert.deepEqual(audioEntries(s).map(([id])=>id),['a']);
 assert.equal(hasAudioPart(song({crashStop:{path:'a.mp3'}}),'crashStop'),false);
 assert.equal(hasAudioPart(song({crashStop:wav('real')}),'crashStop'),true);
});
test('V23: only current decoded and linked crashes appear, not stale buffers',()=>{
 const s=song({crashStop:wav('one'),crashStop2:wav('two')});
 const player={ready:true,song:structuredClone(s),buffers:new Map([['crashStop2',{}],['crashStop3',{}]])};
 assert.deepEqual(ids(preparedCrashParts(s,player)),['crashStop2']);
 player.ready=false; assert.deepEqual(preparedCrashParts(s,player),[]);
 player.ready=true;player.song.id='different';assert.deepEqual(preparedCrashParts(s,player),[]);
 player.song=structuredClone(s);s.parts.crashStop2=wav('replacement');assert.deepEqual(preparedCrashParts(s,player),[]);
});
test('V23: after removal all old buffers are ignored and whole section hides',()=>{
 const s=song({crashStop:wav('one'),crashStop2:wav('two')});
 const state={selected:s};const player={ready:true,song:structuredClone(s),buffers:new Map([['crashStop',{}],['crashStop2',{}]])};
 const pads=['crashStop','crashStop2','crashStop3'].map(part=>({dataset:{part},hidden:true,disabled:false}));
 const section={hidden:true,querySelectorAll:()=>pads};
 const source=app.match(/function updateLiveCrashVisibility\(\) \{[\s\S]*?\n\}/)[0];
 const update=runInNewContext('('+source+')',{state,player,preparedCrashParts,get:()=>section});
 update();assert.equal(section.hidden,false);assert.deepEqual(pads.map(p=>p.hidden),[false,false,true]);
 delete s.parts.crashStop;update();assert.deepEqual(pads.map(p=>p.hidden),[true,false,true]);
 delete s.parts.crashStop2;update();assert.equal(section.hidden,true);assert.ok(pads.every(p=>p.hidden&&p.disabled));
});
test('V23: cloud changes to crash references invalidate stale selection even with identical edit token',()=>{
 const a=song({crashStop:wav('one')});const b=song({});
 assert.notEqual(crashSignature(a),crashSignature(b));
 const f=runInNewContext('('+app.match(/function sortedSignature\(song\) \{[^\n]+\}/)[0]+')',{crashSignature});
 assert.notEqual(f(a),f(b));
});
test('V23: offline availability and download ignore empty optional crash records',async()=>{
 const s=song({a:wav('a'),crashStop:{},crashStop2:{name:'missing.wav'}});
 const calls=[];const disk=[];const repo={audio:async path=>{calls.push(path);return true;},key:(kind,id)=>kind+'/'+id,disk:{batch:async x=>disk.push(...x)},cloud:{audio:async()=>{throw Error('unexpected download');}}};
 assert.equal(await Repository.prototype.available.call(repo,s),true);
 await Repository.prototype.download.call(repo,s);
 assert.deepEqual(calls,[s.parts.a.path,s.parts.a.path]);assert.equal(disk[0][0],'offline/'+s.id);
});
test('V23: visibility updates and guard are wired to Live, pedal and MIDI commands',()=>{
 assert.match(app,/id="live-crashes" hidden/);assert.match(app,/updateLiveCrashVisibility\(\);\s*for \(const pad/);
 assert.match(app,/if\(!target\|\|target.disabled\|\|target.hidden\)return/);
 assert.match(app,/action === 'crash'\) \{ if \(!preparedCrashParts/);
 assert.match(app,/group === 'crashstops' \? hasAudioPart/);
 assert.match(readFileSync(new URL('../dist/audio.js',import.meta.url),'utf8'),/of audioEntries\(song\)/);
});
