import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Player} from '../dist/audio.js';
import {newSong} from '../dist/data.js';
class Param{events=[];cancelScheduledValues(at){this.events=this.events.filter(x=>x.at<at);}setValueAtTime(value,at){this.events.push({value,at});}linearRampToValueAtTime(value,at){this.setValueAtTime(value,at);}setTargetAtTime() {}}
class Source{connect(){return this;}disconnect(){}stop(){this.stopped=true;}start(at,offset=0,duration){assert.ok(Number.isFinite(at)&&Number.isFinite(offset));this.at=at;this.offset=offset;this.duration=duration;}}
class Context{currentTime=10;state='running';sampleRate=48000;createGain(){return {gain:new Param(),connect(){return this;},disconnect(){}};}createBufferSource(){return new Source();}async resume(){}}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
async function playing({part='a',beats=4,bpm=120,finishSeconds=null}={}){
 const p=new Player();p.ctx=new Context();p.mix=p.ctx.createGain();p.context=()=>p.ctx;p.song={...newSong(),kind:'rhythm',beats,bpm,meter:beats===3?'3/4':beats===2?'6/8':'4/4',parts:{},cymbals:{autoVolume:.7}};p.bpm=bpm;p.beatSeconds=60/bpm;p.bar=beats*p.beatSeconds;p.ready=true;p.initialPart=part;p.loopKeys=new Set(['a','b','chorus']);p.buffers=new Map();
 for(const [key,seconds] of Object.entries({a:p.bar,b:p.bar,chorus:p.bar,finish:finishSeconds??p.bar,outro:p.bar*2.5,autoCrash1:3.15,autoCrash2:3.15,autoCrash3:3.15,rideLoop:p.bar,hatOpenLoop:p.bar,hatClosedLoop:p.bar})){p.buffers.set(key,{buffer:{},seconds,beats});p.song.parts[key]={name:key+'.wav',path:'owner/song/'+key+'.wav',bars:1,lengthBeats:beats};}
 await p.start();p.ctx.currentTime=p.epoch+.3;return p;
}
const finish=p=>{assert.equal(p.go('finish'),true);return p.segments.find(s=>s.key==='finish');};
test('V32: one-bar finish gets source section crash at next downbeat, including other meters',async()=>{
 for(const [part,key,beats,bpm] of [['a','autoCrash1',4,120],['b','autoCrash2',3,95],['chorus','autoCrash3',2,80]]){
  const p=await playing({part,beats,bpm});const s=finish(p);const e=p.overlays[0];assert.equal(e.key,key);near(e.at,s.at+p.bar);near((e.at-p.epoch)/p.bar,Math.round((e.at-p.epoch)/p.bar));assert.equal(e.source.loop,false);near(e.gate.gain.events[0].value,.7);assert.equal(p.segments.filter(s=>s.at>=p.pending.entry).length,1);
 }
});
test('V32: finish WAV with recorded last kick is not shortened; crash tail remains after WAV ends',async()=>{
 const p=await playing({finishSeconds:2.5});const s=finish(p),e=p.overlays[0];near(s.source.duration,2.5);p.ctx.currentTime=s.at+2.7;assert.equal(p.summary().active,'finish');assert.ok(p.running);assert.ok(!e.source.stopped);assert.equal(p.go('a'),false);p.ctx.currentTime=e.end+.1;assert.equal(p.summary().running,false);assert.ok(!p.running);
});
test('V32: auto crash survives even if finish WAV ends before landing; STOP cancels it',async()=>{
 const p=await playing({finishSeconds:1});const s=finish(p),e=p.overlays[0];p.ctx.currentTime=s.at+1.5;assert.ok(p.summary().running);assert.ok(!e.source.stopped);p.ctx.currentTime=e.at+.1;assert.ok(p.summary().running);p.stop();assert.ok(e.source.stopped);assert.equal(p.overlays.length,0);
});
test('V32: no double crash on embedded plate, manual yes/no override, disabled or missing auto WAV',async()=>{
 for(const change of [p=>p.song.parts.finish.name='Acabamento com PRATO.wav',p=>p.song.parts.finish.hasCrash='yes',p=>p.song.cymbals.autoEnabled=false,p=>['autoCrash1','autoCrash2','autoCrash3'].forEach(k=>p.buffers.delete(k))]){const p=await playing();change(p);const s=finish(p);assert.equal(p.overlays.length,0);near(s.naturalEnd,s.at+p.bar);}
 const p=await playing();p.song.parts.finish.name='Acabamento com prato.wav';p.song.parts.finish.hasCrash='no';finish(p);assert.equal(p.overlays.length,1);
});
test('V32: custom final plays entire file without automatic addition',async()=>{const p=await playing();assert.ok(p.go('outro'));const s=p.segments.at(-1);assert.equal(s.key,'outro');near(s.source.duration,p.bar*2.5);assert.equal(p.overlays.length,0);p.ctx.currentTime=s.end+.1;assert.equal(p.summary().running,false);});
test('V32: cancellation and toggling before the landing affect the scheduled final crash',async()=>{const p=await playing();finish(p);const e=p.overlays[0];assert.ok(p.cancel());assert.ok(e.source.stopped);assert.equal(p.overlays.length,0);const s=finish(p);p.ctx.currentTime=s.at+.2;assert.ok(p.toggleAutoCrash());assert.equal(p.overlays.length,0);near(s.end,s.finishAudioEnd);assert.ok(p.toggleAutoCrash());assert.equal(p.overlays.length,1);near(p.overlays[0].at,s.finishLanding);});
test('V32: eligible cymbal layers continue through finish but stop at landing, never during tail',async()=>{
 for(const part of ['a','chorus']){const p=await playing({part});for(const key of ['rideLoop','hatOpenLoop','hatClosedLoop'])p.toggleLayer(key);p.ctx.currentTime=p.rideLayers[0].at+.1;const s=finish(p);const layers=p.rideLayers.filter(l=>l.segment===s);assert.deepEqual(layers.map(l=>l.key),part==='a'?['hatClosedLoop']:['rideLoop','hatOpenLoop']);for(const l of layers){near(l.end,s.finishLanding);assert.ok(l.gate.gain.events.some(e=>e.value===0&&Math.abs(e.at-s.finishLanding)<1e-6));}p.ctx.currentTime=s.finishLanding+.1;assert.ok(p.summary().running);assert.ok(Object.values(p.summary().layerStates).every(v=>v!=='playing'));}
});
test('V32: editor describes separate ending and exposes existing crash metadata override',()=>{const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');assert.match(app,/Acabamento já contém prato de ataque/);assert.match(app,/data-wav-cymbal="hasCrash" data-part="finish"/);assert.match(app,/Final: WAV personalizado, sem acrescentar crash automático/);});
