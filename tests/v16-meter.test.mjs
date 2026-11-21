import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {METERS,meterOf,countForMeter,validMeter,meterChoice,beatUnitForChoice,meterHint,wavMeasure,classifyDuration} from '../dist/meter.js';
import {newSong} from '../dist/data.js';
import {Player,nextBoundary} from '../dist/audio.js';

const ui=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const api=readFileSync(new URL('../netlify/functions/loops-api.mjs',import.meta.url),'utf8');
const backup=readFileSync(new URL('../dist/backup.js',import.meta.url),'utf8');

test('V16: compasso is explicit in the UI and old music keeps its exact old 4/4 basis',()=>{
 const old={name:'Antiga',bpm:96,beats:4};
 assert.equal(meterOf(old),'4/4');
 assert.equal(wavMeasure(old),2.5);
 assert.equal(newSong().meter,'4/4');
 for(const signature of ['2/4','3/4','4/4','5/4','6/4','6/8','9/8','12/8'])
   assert.ok(METERS.find(m=>m.value===signature),signature);
 assert.match(ui,/data-field="meter"/);
 assert.match(ui,/classifyDuration\(duration,song,fill\)/);
 assert.match(ui,/escape\(meterOf\(song\)\)/);
 assert.match(backup,/meter: meterOf\(song\)/);
 assert.match(api,/validMeter\(content\)/);
});

test('V16: 3/4 balada/valsa accepts full bars and rejects 4/4-sized WAV',()=>{
 const song={bpm:90,meter:'3/4',beats:countForMeter('3/4')};
 assert.equal(song.beats,3);
 assert.equal(wavMeasure(song),2);
 assert.deepEqual(classifyDuration(4,song),{ok:true,beats:6,bars:2,barSeconds:2});
 assert.equal(classifyDuration(8/3,song).reason,'bar');
 assert.equal(validMeter(song),true);
});

test('V16: 2/4 country accepts two quarter-note pulses per bar',()=>{
 const song={bpm:120,meter:'2/4',beats:countForMeter('2/4')};
 assert.equal(wavMeasure(song),1);
 assert.equal(classifyDuration(2,song).bars,2);
});

test('V16: compound 6/8 blues uses 2 dotted-quarter pulses, not 4/4',()=>{
 const song={bpm:80,meter:'6/8',beats:countForMeter('6/8')};
 assert.equal(song.beats,2);
 assert.equal(wavMeasure(song),1.5);
 assert.ok(meterHint(song).includes('semínima pontuada'));
 assert.equal(classifyDuration(3,song).bars,2);
 assert.equal(classifyDuration(3,song).beats,4);
 assert.equal(classifyDuration(1.5,{...song,meter:'4/4',beats:4}).reason,'bar');
 assert.equal(validMeter({...song,beats:6}),false);
});

test('V16: 9/8 and 12/8 are counted as 3 and 4 compound pulses',()=>{
 assert.equal(countForMeter('9/8'),3);
 assert.equal(countForMeter('12/8'),4);
 assert.equal(wavMeasure({bpm:60,beats:3,meter:'9/8'}),3);
 assert.equal(wavMeasure({bpm:60,beats:4,meter:'12/8'}),4);
 assert.equal(countForMeter('7/8'),7);
 assert.equal(validMeter({beats:7,meter:'7/8'}),true);
});

test('V16: bar boundary for 3/4 and 6/8 follows musical pulses (not fixed 4)',()=>{
 const epoch=0,now=1.1;
 const triple=3*60/90,compound=2*60/80;
 assert.equal(nextBoundary(epoch,triple,now),2);
 assert.equal(nextBoundary(epoch,compound,now),1.5);
 const p=new Player(); p.song={meter:'6/8',beats:2,bpm:80};
 p.bpm=80;p.beatSeconds=.75;p.bar=p.song.beats*p.beatSeconds;
 assert.equal(p.bar,1.5);
});


test('V16: 6/8 also accepts DAW quarter-note BPM without altering the meter label',()=>{
 const basic={bpm:80,meter:'6/8',beats:2};
 const quarter={bpm:80,meter:'6/8',beatUnit:'quarter',beats:3};
 assert.equal(meterChoice(basic),'6/8');
 assert.equal(meterChoice(quarter),'6/8@quarter');
 assert.equal(beatUnitForChoice('6/8@quarter'),'quarter');
 assert.equal(countForMeter('6/8@quarter'),3);
 assert.equal(meterOf(quarter),'6/8');
 assert.equal(wavMeasure(quarter),2.25);
 assert.equal(classifyDuration(2.25,quarter).bars,1);
 assert.equal(validMeter(quarter),true);
 assert.equal(validMeter({...quarter,beats:2}),false);
 assert.match(ui,/beatUnitForChoice\(input.value\)/);
 assert.match(backup,/beatUnit:song.beatUnit/);
});
