import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MidiController,decodeMidi,cleanMidiSettings,loadMidiSettings,saveMidiSettings,MIDI_KEY} from '../dist/midi.js';
const device={id:'usb1',name:'Pad Controller',manufacturer:'Test'};
const port=(d=device)=>({...d,state:'connected',onmidimessage:null});
function fixture(settings={enabled:true,mappings:[]}){
  const p=port(), access={inputs:new Map([[p.id,p]]),onstatechange:null};
  const events=[],learned=[],signals=[];
  const midi=new MidiController({navigator:{requestMIDIAccess:async options=>{assert.deepEqual(options,{sysex:false});return access;}},settings,onCommand:(...args)=>events.push(args),onLearn:m=>learned.push(m),onSignal:m=>signals.push(m)});
  return {midi,p,access,events,learned,signals,send(data,p2=p){p2.onmidimessage?.({data:Uint8Array.from(data)});}};
}
const binding=(command,number,extra={})=>({command,number,channel:0,type:'note',device,...extra});
test('V22 decodifica note-on/off inclusive velocidade zero, CC e Program Change',()=>{
  assert.deepEqual(decodeMidi([0x99,36,100]),{type:'note',channel:9,number:36,value:100,release:false});
  assert.equal(decodeMidi([0x90,36,0]).release,true);assert.equal(decodeMidi([0x80,36,50]).release,true);
  assert.equal(decodeMidi([0xb2,10,127]).type,'cc');assert.equal(decodeMidi([0xc1,7]).type,'program');
  for(const data of [[0xf8],[0xfe],[0xf0,10,10],[0xb0,123,0],[0xa0,25,127],[0x90,36]])assert.equal(decodeMidi(data),null);
});
test('V22 Learn captura pad sem disparar ação; note-off não dispara, próximo toque dispara uma vez',async()=>{
 const f=fixture();await f.midi.connect();f.midi.learn('part:a');f.send([0x90,36,120]);assert.equal(f.learned.length,1);assert.deepEqual(f.events,[]);
 f.send([0x90,36,90]);f.send([0x90,36,0]);f.send([0x90,36,100]);f.send([0x90,36,100]);f.send([0x80,36,0]);f.send([0x90,36,127]);
 assert.deepEqual(f.events,[['part:a',100],['part:a',127]]);
});
test('V22 CC botão dispara apenas na borda, volume absoluto aceita zero e valores intermediários',async()=>{
 const f=fixture({enabled:true,mappings:[binding('crash:crashStop',10,{type:'cc'}),binding('volume-absolute',7,{type:'cc'})]});await f.midi.connect();
 for(const v of [0,80,127,63,100,0])f.send([0xb0,10,v]);for(const v of [0,50,50,127,0])f.send([0xb0,7,v]);
 assert.deepEqual(f.events,[['crash:crashStop',80],['crash:crashStop',100],['volume-absolute',0],['volume-absolute',50],['volume-absolute',127],['volume-absolute',0]]);
});
test('V22 knob CC relativo em modo variação e Program Change são aprendidos',async()=>{
 const f=fixture();await f.midi.connect();f.midi.learn('faster',{mode:'change'});f.send([0xb0,22,1]);f.send([0xb0,22,2]);f.send([0xb0,22,2]);
 f.midi.learn('stop');f.send([0xc0,3]);f.send([0xc0,3]);assert.deepEqual(f.events,[['faster',2],['stop',127]]);
});
test('V22 desativar MIDI não apaga mapeamentos e nada executa; cancelamento não aprende',async()=>{
 const f=fixture({enabled:false,mappings:[binding('stop',40)]});await f.midi.connect();f.send([0x90,40,100]);f.send([0x80,40,0]);f.midi.learn('part:b');f.midi.cancelLearn();f.send([0x90,41,100]);assert.equal(f.learned.length,0);assert.deepEqual(f.events,[]);f.midi.settings.enabled=true;f.send([0x90,40,100]);assert.deepEqual(f.events,[['stop',100]]);
});
test('V22 vários controladores, canais distintos, prioridade de dispositivo sobre qualquer dispositivo',async()=>{
 const f=fixture({enabled:true,mappings:[binding('part:a',36),binding('part:b',36,{anyDevice:true}),binding('part:chorus',36,{channel:9})]});await f.midi.connect();const p2=port({...device,id:'usb2'});f.access.inputs.set(p2.id,p2);f.access.onstatechange();
 f.send([0x90,36,100]);f.send([0x90,36,100],p2);f.send([0x99,36,100]);assert.deepEqual(f.events,[['part:a',100],['part:b',100],['part:chorus',100]]);
});
test('V22 desconexão remove listener, reconexão pelo nome reaproveita associação sem duplicar',async()=>{
 const f=fixture({enabled:true,mappings:[binding('part:a',36)]});await f.midi.connect();f.send([0x90,36,100]);f.access.inputs.clear();f.access.onstatechange();assert.equal(f.p.onmidimessage,null);
 const p2=port({...device,id:'new-id'});f.access.inputs.set(p2.id,p2);f.access.onstatechange();f.send([0x90,36,100],p2);assert.equal(f.events.length,2);f.midi.disconnect();assert.equal(p2.onmidimessage,null);
});
test('V22 prefere porta original e não confunde dispositivos com nomes idênticos',async()=>{
 const f=fixture({enabled:true,mappings:[binding('stop',40)]});await f.midi.connect();const p2=port({...device,id:'usb2'});f.access.inputs.set(p2.id,p2);f.access.onstatechange();f.send([0x90,40,100],p2);assert.deepEqual(f.events,[]);f.send([0x90,40,100]);assert.equal(f.events.length,1);
});
test('V22 armazenamento e restauração sanitizam dados e substituem conflito no mesmo controle',()=>{
 const storage=new Map();const adapter={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)};
 saveMidiSettings(adapter,{enabled:true,mappings:[binding('part:a',36),binding('part:b',36),binding('delete',38),binding('volume-absolute',7),binding('stop',128)]});
 const loaded=loadMidiSettings(adapter);assert.equal(loaded.enabled,true);assert.equal(loaded.mappings.length,1);assert.equal(loaded.mappings[0].command,'part:b');assert.ok(storage.has(MIDI_KEY));
 assert.deepEqual(cleanMidiSettings({mappings:null}),{enabled:false,mappings:[]});
});
test('V22 ausência de Web MIDI e permissão recusada são erros tratáveis',async()=>{
 const off=new MidiController({navigator:{},settings:{}});assert.equal(off.supported,false);await assert.rejects(off.connect(),/Web MIDI/);
 const denied=new MidiController({navigator:{requestMIDIAccess:async()=>{throw new Error('denied');}},settings:{}});await assert.rejects(denied.connect(),/denied/);assert.equal(denied.pending,null);
});
test('V22 integração: ícone ao lado do pedal, mesmos comandos Live, cache e backup',()=>{
 const read=p=>readFileSync(new URL('../dist/'+p,import.meta.url),'utf8');const app=read('app.js'),backup=read('backup.js');
 assert.match(app,/iconButton\('pedal-setup'[^\n]+\+midiIcon\(\)/);assert.match(app,/handleAction\(target\)\.then\(feedback\)/);assert.match(app,/target\.disabled/);assert.match(app,/dialog\.open/);
 assert.match(backup,/midiSettings:loadMidiSettings/);assert.match(backup,/saveMidiSettings\(localStorage,p\.midiSettings\)/);assert.match(read('sw.js'),/\.\/midi\.js/);assert.match(read('_headers'),/midi=\(self\)/);
});
test('V22 encoder relativo pode repetir o mesmo valor a cada pulso',async()=>{
 const f=fixture();await f.midi.connect();f.midi.learn('faster',{mode:'relative'});f.send([0xb0,20,1]);f.send([0xb0,20,1]);f.send([0xb0,20,1]);assert.deepEqual(f.events,[['faster',1],['faster',1]]);
});
