import {cleanMidiSettings,MIDI_KEY} from './midi.js';
export const PEDAL_KEY='loops-v12-pedal-map';
const COUNT='loops-v20-count-';
export function preferenceKey(k){return k===MIDI_KEY||k===PEDAL_KEY||/^loops-v20-count-(?:[a-f0-9-]{30,45}|rep:[a-f0-9-]{30,45}:[\w-]{1,80})$/i.test(k);}
export function cleanPreference(k,v){
  if(k===MIDI_KEY)return cleanMidiSettings(v);
  if(k===PEDAL_KEY){const entries=Object.entries(v&&typeof v==='object'&&!Array.isArray(v)?v:{}).filter(([key,x])=>/^[\w .+:-]{1,100}$/.test(key)&&!['__proto__','constructor','prototype'].includes(key)&&Number.isInteger(x?.slot)&&x.slot>=0&&x.slot<512&&typeof x.command==='string'&&/^[\w:-]{0,100}$/.test(x.command));return Object.fromEntries(entries.slice(0,512).map(([key,x])=>[key,{slot:x.slot,command:x.command}]));}
  if(preferenceKey(k)&&typeof v?.enabled==='boolean'&&[1,2].includes(v.bars))return {enabled:v.enabled,bars:v.bars};
  return null;
}
const parse=(storage,k)=>{try{return JSON.parse(storage.getItem(k)||'null');}catch{return null;}};
// Per-account journal. An absent entry is never sent as an empty default.
export class PreferenceSync{
  constructor(storage,owner){this.storage=storage;this.owner=owner;this.key='loops-v29-preferences:'+owner;this.doc=parse(storage,this.key)||{fields:{},initialized:false};}
  save(){this.storage.setItem(this.key,JSON.stringify(this.doc));}
  apply(k,v){if(this.storage.getItem('loops-v29-preferences-owner')===this.owner)this.storage.setItem(k,JSON.stringify(v));}
  hydrate(){const previous=this.storage.getItem('loops-v29-preferences-owner');if(previous&&previous!==this.owner){for(const k of Object.keys(this.storage))if(preferenceKey(k))this.storage.removeItem(k);this.storage.removeItem(MIDI_KEY);this.storage.removeItem(PEDAL_KEY);}
    this.storage.setItem('loops-v29-preferences-owner',this.owner);for(const [k,x] of Object.entries(this.doc.fields))this.apply(k,x.value);}
  change(k,value){if(!preferenceKey(k))return;const v=cleanPreference(k,value);if(v===null)return;const old=this.doc.fields[k];this.doc.fields[k]={revision:old?.revision??null,value:v,dirty:true,token:crypto.randomUUID(),...(old?.conflict?{conflict:old.conflict}:{})};this.save();this.apply(k,v);}
  legacy(){const keys=[MIDI_KEY,PEDAL_KEY,...Object.keys(this.storage).filter(k=>k.startsWith(COUNT)&&preferenceKey(k))];return Object.fromEntries(keys.flatMap(k=>{const v=parse(this.storage,k);if(v===null)return [];const c=cleanPreference(k,v);if(c===null||k===MIDI_KEY&&!c.mappings.length&&!c.enabled||k===PEDAL_KEY&&!Object.keys(c).length)return [];return [[k,c]];}));}
  async sync(cloud){if(cloud.session&&cloud.session()?.id!==this.owner)throw new Error('Conta alterada.');const remote=await cloud.request('?op=preferences');const rows=remote.fields||{};
    if(!this.doc.initialized){for(const [k,v] of Object.entries(this.legacy()))if(!this.doc.fields[k]&&(!rows[k]||JSON.stringify(rows[k].value)!==JSON.stringify(v)))this.change(k,v);this.doc.initialized=true;}
    for(const [k,row] of Object.entries(rows)){if(!preferenceKey(k))continue;const local=this.doc.fields[k];if(!local?.dirty){this.doc.fields[k]={revision:row.revision,value:row.value};this.apply(k,row.value);}}
    this.save();
    const batch=Object.entries(this.doc.fields).filter(([,x])=>x.dirty).map(([key,x])=>({key,revision:x.revision??0,value:x.value,token:x.token}));
    if(!batch.length)return;
    if(cloud.session&&cloud.session()?.id!==this.owner)throw new Error('Conta alterada.');
    const result=await cloud.request('?op=preferences-save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({changes:batch})});
    for(const item of batch){const current=this.doc.fields[item.key],saved=result.fields?.[item.key];if(!saved||!current)continue;
      if(result.conflicts?.includes(item.key)){current.conflict=saved;continue;}
      if(current.token===item.token){this.doc.fields[item.key]={revision:saved.revision,value:saved.value};this.apply(item.key,saved.value);}else current.revision=saved.revision;
    }
    this.save();if(Object.values(this.doc.fields).some(x=>x.conflict))throw new Error('Conflito de configurações MIDI/pedal/contagem. Abra Configurações > Resolver sincronização. A cópia local foi preservada.');
    if(Object.values(this.doc.fields).some(x=>x.dirty))throw new Error('Configurações novas aguardando sincronização.');
  }
  resolve(useLocal){for(const [k,x] of Object.entries(this.doc.fields)){if(!x.conflict)continue;const remote=x.conflict;if(useLocal){x.revision=remote.revision;delete x.conflict;}else{this.doc.fields[k]={revision:remote.revision,value:remote.value};this.apply(k,remote.value);}}this.save();}
}
// Server-side patch calculation: compare per-field revisions, never overwrite an unrelated field.
export function applyPreferenceChanges(fields,changes){const next={...fields},conflicts=[];for(const {key,revision,value} of changes){const old=next[key];if((old?.revision||0)!==revision){if(JSON.stringify(old?.value)!==JSON.stringify(cleanPreference(key,value)))conflicts.push(key);continue;}next[key]={revision:revision+1,value:cleanPreference(key,value)};}return {fields:next,conflicts};}
