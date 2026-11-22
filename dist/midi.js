// V33 — MIDI connection diagnostics; independent from HID and audio.
export const MIDI_KEY = 'loops-v22-midi-settings';
const COMMAND = /^(?:start|play|stop|ride-toggle|hat-open-toggle|hat-closed-toggle|auto-crash-toggle|restart-intro|mode-toggle|cancel-queue|slower|faster|bpm-absolute|volume-absolute|mix:(?:master|loops|fills|cymbals|counter|passage|count|endings)|toggle-live-count|count-one|count-two|rep-prev-live|rep-next-live|open-library|map-next|map-previous|(?:part|fill|crash|break):[A-Za-z0-9_-]{1,80})$/;
const cleanString = value => typeof value === 'string' ? value.slice(0,250) : '';
const absolute = command => ['bpm-absolute','volume-absolute'].includes(command)||command.startsWith('mix:');
export function cleanMidiSettings(raw) {
  const mappings=[];
  for(const m of Array.isArray(raw?.mappings)?raw.mappings:[]) {
    if(!m || !COMMAND.test(m.command||'') || !['note','cc','program'].includes(m.type) || !Number.isInteger(m.channel) || m.channel<0 || m.channel>15 || !Number.isInteger(m.number) || m.number<0 || m.number>127 || (m.type==='cc'&&m.number>=120) || (absolute(m.command)&&m.type!=='cc')) continue;
    const device={id:cleanString(m.device?.id),name:cleanString(m.device?.name),manufacturer:cleanString(m.device?.manufacturer)};
    const mapping={command:m.command,type:m.type,channel:m.channel,number:m.number,device,anyDevice:m.anyDevice===true,mode:m.type==='cc'&&['change','relative'].includes(m.mode)?m.mode:'press'};
    const idx=mappings.findIndex(old=>sameBinding(old,mapping));
    if(idx>=0)mappings.splice(idx,1);
    mappings.push(mapping);
  }
  return {enabled:raw?.enabled===true,mappings};
}
export function loadMidiSettings(storage) {
  try{return cleanMidiSettings(JSON.parse(storage.getItem(MIDI_KEY)||'{}'));}catch{return cleanMidiSettings(null);}
}
export function saveMidiSettings(storage,settings) {
  storage.setItem(MIDI_KEY,JSON.stringify(cleanMidiSettings(settings)));
}
export function describePort(port) {return {id:cleanString(port?.id),name:cleanString(port?.name),manufacturer:cleanString(port?.manufacturer)};}
const identity = d => d.id || `${d.manufacturer}|${d.name}`;
const sameSignal = (a,b) => a.type===b.type && a.channel===b.channel && a.number===b.number;
export const sameBinding = (a,b) => sameSignal(a,b) && (a.anyDevice&&b.anyDevice || !a.anyDevice&&!b.anyDevice&&identity(a.device)===identity(b.device));
export function decodeMidi(data) {
  if(!data||data.length<2)return null;
  const [status,number,value]=data;
  if(!Number.isInteger(status)||!Number.isInteger(number)||number<0||number>127)return null;
  const channel=status&15, kind=status&240;
  if(kind===192)return {type:'program',channel,number,value:127,release:false};
  if(data.length<3||!Number.isInteger(value)||value<0||value>127)return null;
  if(kind===144||kind===128)return {type:'note',channel,number,value,release:kind===128||value===0};
  if(kind===176&&number<120)return {type:'cc',channel,number,value,release:false};
  return null; // clocks, active sensing, sysex, aftertouch and channel-mode messages
}
export function bindingMatches(mapping,message,port,ports=[]) {
  if(!sameSignal(mapping,message))return false;
  if(mapping.anyDevice)return true;
  if(mapping.device.id&&mapping.device.id===port.id)return true;
  // Browser IDs can change after switching USB ports or restoring a backup. Only
  // fall back to name/manufacturer if no exact device is connected and unambiguous.
  if(!mapping.device.name||mapping.device.name!==port.name||mapping.device.manufacturer!==port.manufacturer)return false;
  if(ports.some(p=>p.id===mapping.device.id))return false;
  return ports.filter(p=>p.name===port.name&&p.manufacturer===port.manufacturer).length===1;
}
// Standard Web MIDI maps, legacy bridge arrays/getInputs and reconnect snapshots.
export function listMidiInputs(access){
  if(!access)return [];
  const ports=[];const add=p=>{if(p&&p.state!=='disconnected'&&p.type!=='output'&&!ports.includes(p))ports.push(p);};
  function collect(inputs){if(!inputs)return;if(typeof inputs.values==='function'){for(const p of inputs.values())add(p);}else if(typeof inputs.forEach==='function')inputs.forEach(add);else if(typeof inputs[Symbol.iterator]==='function')for(const p of inputs)add(Array.isArray(p)?p[1]:p);else if(Number.isInteger(inputs.length))for(let i=0;i<inputs.length;i++)add(inputs[i]);else if(typeof inputs==='object')Object.values(inputs).forEach(add);}
  try{collect(access.inputs);}catch{}
  if(!ports.length){try{if(typeof access.getInputs==='function')collect(access.getInputs());else if(typeof access.inputs==='function')collect(access.inputs());}catch{}}
  return ports;
}
export class MidiController {
  constructor({navigator,settings,onCommand=()=>{},onSignal=()=>{},onChange=()=>{},onLearn=()=>{},onRawSignal=()=>{},timeoutMs=15000}) {
    this.navigator=navigator;this.settings=cleanMidiSettings(settings);this.onCommand=onCommand;this.onSignal=onSignal;this.onChange=onChange;this.onLearn=onLearn;this.onRawSignal=onRawSignal;this.timeoutMs=timeoutMs;
    this.access=null;this.ports=new Map();this.values=new Map();this.learning=null;this.pending=null;this.generation=0;this.permission="unknown";this.lastError="";this.portErrors=new Map();this.opening=new Map();this.signalCount=0;this.permissionScan=0;
  }
  get supported(){return typeof this.navigator?.requestMIDIAccess==='function';}
  get devices(){return [...this.ports.entries()].map(([id,p])=>({...describePort(p.port),id}));}
  get diagnostics(){return {supported:this.supported,permission:this.permission,connected:!!this.access,connecting:!!this.pending,error:this.lastError,signalCount:this.signalCount,ports:[...this.ports.values()].map(({port})=>({...describePort(port),state:port.state||'unknown',connection:port.connection||'unknown',error:this.portErrors.get(port.id)||''}))};}
  async checkPermission(){
    const scan=++this.permissionScan;
    let result='unknown';
    try{const status=await this.navigator?.permissions?.query({name:'midi',sysex:false});if(['granted','denied','prompt'].includes(status?.state))result=status.state;}catch{/* Some bridges do not implement the Permissions API. */}
    if(scan===this.permissionScan){this.permission=result==='unknown'&&this.access?'granted':result;this.onChange();}return this.permission;
  }
  async connect({force=false,compatibility=false}={}) {
    if(!this.supported)throw new Error('Este navegador não oferece Web MIDI. Use Chrome compatível ou uma ponte Web MIDI no iPhone.');
    if(force)this.disconnect();
    if(this.access){this.refresh();return;}
    if(this.pending)return this.pending;
    const generation=++this.generation;this.lastError='';let timer;
    const task=(async()=>{
      try{
        const request=compatibility?this.navigator.requestMIDIAccess():this.navigator.requestMIDIAccess({sysex:false});
        const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Tempo limite da autorização MIDI. Confira a permissão e tente Reconectar.')),this.timeoutMs);});
        const access=await Promise.race([request,timeout]);
        if(generation!==this.generation)return;
        if(!access||(!access.inputs&&typeof access.getInputs!=='function'))throw new Error('O navegador não retornou entradas MIDI válidas.');
        this.access=access;this.permissionScan++;this.permission='granted';
        access.onstatechange=()=>{if(this.access===access)this.refresh();};this.refresh();
      }catch(error){if(generation!==this.generation)return;this.lastError=error?.message||String(error);if(error?.name==='NotAllowedError'||error?.name==='SecurityError'){this.permissionScan++;this.permission='denied';}throw error;}
      finally{clearTimeout(timer);}
    })();
    this.pending=task;this.onChange();
    try{await task;}finally{if(this.pending===task){this.pending=null;this.onChange();}}
  }
  reconnect(){return this.connect({force:true});}
  connectCompatible(){return this.connect({force:true,compatibility:true});}
  disconnect(){this.generation++;this.permissionScan++;this.pending=null;this.learning=null;for(const {port,receive} of this.ports.values())if(port.onmidimessage===receive)port.onmidimessage=null;
    if(this.access)this.access.onstatechange=null;this.access=null;this.ports.clear();this.values.clear();this.opening.clear();this.portErrors.clear();this.signalCount=0;this.lastError='';this.onChange();}
  refresh(){
    const connected=new Map();
    listMidiInputs(this.access).forEach((port,index)=>connected.set(port.id||'bridge-'+index,port));
    for(const [id,{port,receive}] of this.ports)if(connected.get(id)!==port){
      if(port.onmidimessage===receive)port.onmidimessage=null;this.ports.delete(id);this.opening.delete(id);this.portErrors.delete(id);
      for(const key of this.values.keys())if(key.startsWith(JSON.stringify(id)+':'))this.values.delete(key);
    }
    for(const [id,port] of connected){
      if(!this.ports.has(id)){
        const receive=event=>{if(this.ports.get(id)?.port===port){const device={...describePort(port),id};this.signalCount++;this.onRawSignal(event.data,device,this.signalCount);this.receive(event.data,device);}};
        this.ports.set(id,{port,receive});port.onmidimessage=receive;
      }else if(port.onmidimessage!==this.ports.get(id).receive){port.onmidimessage=this.ports.get(id).receive;}
      // Explicit open supports devices/bridges which do not open merely by assigning a handler.
      if(typeof port.open==='function'&&port.connection!=='open'&&!this.opening.has(id)&&!this.portErrors.has(id)){
        const token={};this.opening.set(id,token);
        Promise.resolve().then(()=>{if(this.opening.get(id)===token)return port.open();}).catch(error=>{if(this.opening.get(id)===token)this.portErrors.set(id,error?.message||String(error));}).finally(()=>{if(this.opening.get(id)===token){this.opening.delete(id);this.onChange();}});
      }
    }
    this.onChange();
  }
  rescan(){this.portErrors.clear();this.refresh();return this.devices;}
  learn(command,{anyDevice=false,mode='press'}={}){if(!COMMAND.test(command))return false;this.learning={command,anyDevice,mode};return true;}
  cancelLearn(){this.learning=null;}
  receive(data,device){
    const message=decodeMidi(data);if(!message)return;
    const key=JSON.stringify(device.id)+':'+message.type+':'+message.channel+':'+message.number;
    const previous=this.values.get(key);this.values.set(key,message.release?0:message.value);
    this.onSignal(message,device);
    if(this.learning){
      const l=this.learning;
      if(message.release||message.type==='cc'&&(absolute(l.command)?previous===message.value:l.mode==='relative'?false:l.mode==='change'?previous===message.value:message.value<64)||absolute(l.command)&&message.type!=='cc')return;
      const mapping={...l,device,type:message.type,channel:message.channel,number:message.number};
      this.settings.mappings=this.settings.mappings.filter(m=>!sameBinding(m,mapping));
      this.settings=cleanMidiSettings({...this.settings,mappings:[...this.settings.mappings,mapping]});
      this.learning=null;this.onLearn(mapping);return; // learning must never trigger playback
    }
    if(!this.settings.enabled||message.release)return;
    const matches=this.settings.mappings.filter(m=>bindingMatches(m,message,device,this.devices));
    // A specific device takes precedence over a wildcard. Never dispatch twice.
    const mapping=matches.find(m=>!m.anyDevice)||matches[0];if(!mapping)return;
    if(message.type==='note'&&previous>0)return;
    if(message.type==='cc'){
      if(absolute(mapping.command)||mapping.mode==='change'){if(previous===message.value)return;}
      else if(mapping.mode!=='relative'&&(message.value<64||previous>=64))return; // button press edge, not release
    }
    this.onCommand(mapping.command,message.value);
  }
}
