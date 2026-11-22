import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MidiController} from '../dist/midi.js';
const makePort=(id='p')=>({id,name:'Controller',manufacturer:'Test',state:'connected',connection:'closed',opens:0,async open(){this.opens++;this.connection='open';}});
const makeAccess=p=>({inputs:new Map(p?[[p.id,p]]:[])});
const flush=()=>new Promise(r=>setImmediate(r));
test('V31 explicitly opens port; monitors raw and learned signals',async()=>{
 const p=makePort(),a=makeAccess(p),raw=[],commands=[];
 const m=new MidiController({navigator:{requestMIDIAccess:async()=>a},settings:{enabled:true,mappings:[{command:'stop',type:'note',channel:0,number:36,device:p}]},onRawSignal:(...v)=>raw.push(v),onCommand:(...v)=>commands.push(v)});
 await m.connect();await flush();assert.equal(p.opens,1);assert.equal(m.diagnostics.ports[0].connection,'open');
 p.onmidimessage({data:[0xf8]});p.onmidimessage({data:[0x90,36,120]});assert.equal(raw.length,2);assert.equal(m.diagnostics.signalCount,2);assert.deepEqual(commands,[['stop',120]]);
});
test('V31 reconnect requests fresh session and preserves mappings',async()=>{
 const p=makePort(),q=makePort('new'),a=makeAccess(p),b=makeAccess(q);let calls=0;
 const m=new MidiController({navigator:{requestMIDIAccess:async()=>++calls===1?a:b},settings:{enabled:true,mappings:[{command:'stop',type:'note',channel:0,number:36,device:p}]}});
 await m.connect();const before=JSON.stringify(m.settings);await m.reconnect();await flush();assert.equal(calls,2);assert.equal(p.onmidimessage,null);assert.equal(a.onstatechange,null);assert.equal(m.devices[0].id,'new');assert.equal(q.opens,1);assert.equal(JSON.stringify(m.settings),before);
});
test('V31 rescan detects new port even without statechange and retries failed opening',async()=>{
 const a=makeAccess(),p=makePort();let tries=0;p.open=async()=>{if(++tries===1)throw Error('busy');p.connection='open';};
 const m=new MidiController({navigator:{requestMIDIAccess:async()=>a}});await m.connect();assert.equal(m.devices.length,0);a.inputs.set(p.id,p);m.rescan();await flush();assert.equal(m.diagnostics.ports[0].error,'busy');m.rescan();await flush();assert.equal(tries,2);assert.equal(m.diagnostics.ports[0].error,'');assert.equal(p.connection,'open');
});
test('V31 permission diagnostics distinguish denied, prompt and unsupported API',async()=>{
 let state='prompt';const m=new MidiController({navigator:{permissions:{query:async()=>({state})},requestMIDIAccess:async()=>{throw Object.assign(Error('denied'),{name:'NotAllowedError'});}}});
 assert.equal(await m.checkPermission(),'prompt');state='denied';assert.equal(await m.checkPermission(),'denied');await assert.rejects(m.connect(),/denied/);assert.equal(m.diagnostics.permission,'denied');assert.equal(m.diagnostics.connecting,false);assert.equal(await new MidiController({navigator:{}}).checkPermission(),'unknown');
});
test('V31 timeout releases pending request, late access cannot replace new access',async()=>{
 let resolve,requests=0;const p=makePort(),q=makePort('new'),a=makeAccess(p),b=makeAccess(q);
 const m=new MidiController({timeoutMs:10,navigator:{requestMIDIAccess:()=>++requests===1?new Promise(r=>resolve=r):Promise.resolve(b)}});
 await assert.rejects(m.connect(),/Tempo limite/);assert.equal(m.pending,null);await m.reconnect();resolve(a);await flush();assert.equal(m.access,b);assert.equal(p.onmidimessage,undefined);
});
test('V31 forced reconnect ignores in-flight earlier request and avoids duplicate listeners',async()=>{
 let resolve,calls=0;const a=makeAccess(makePort()),b=makeAccess(makePort('new'));const m=new MidiController({navigator:{requestMIDIAccess:()=>++calls===1?new Promise(r=>resolve=r):Promise.resolve(b)}});
 const first=m.connect();await m.reconnect();resolve(a);await first;assert.equal(m.access,b);assert.equal(m.devices.length,1);assert.equal(a.onstatechange,undefined);
});
test('V31 UI includes diagnostics and recovery on shared MIDI modal, preserves storage key',()=>{
 const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');for(const text of ['Reconectar MIDI','Buscar dispositivos','midi-diagnostic','midi-raw','midi.checkPermission()','midi.rescan()','midi.reconnect()'])assert.ok(app.includes(text),text);
 const midi=readFileSync(new URL('../dist/midi.js',import.meta.url),'utf8');assert.match(midi,/loops-v22-midi-settings/);
});

test('V31 bridge without Permissions API retains authorized state after diagnostic',async()=>{const m=new MidiController({navigator:{requestMIDIAccess:async()=>makeAccess(makePort())}});await m.connect();assert.equal(await m.checkPermission(),'granted');assert.equal(m.diagnostics.permission,'granted');});
