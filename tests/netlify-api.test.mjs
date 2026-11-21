import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { Cloud } from '../dist/data.js';

const owner='8a6e1a46-7dc8-4e9a-b2ab-e2a33a050fa9';
const songId='10d5b59b-95a7-478e-9a6b-69b81caf1c91';
let loggedIn=true;
class Store {
  constructor(){this.items=new Map();}
  async set(key, value, conditions={}) {return this.setJSON(key, value, conditions);}
  async setJSON(key,value,{onlyIfNew=false,onlyIfMatch}={}) {
    const old=this.items.get(key);
    if ((onlyIfNew&&old)||(onlyIfMatch&&old?.etag!==onlyIfMatch))return {modified:false};
    const etag='"'+Math.random().toString(36).slice(2)+'"';
    this.items.set(key,{value,etag});
    return {modified:true,etag};
  }
  async get(key, {type}={}) {
    const value=this.items.get(key)?.value;
    if (value==null)return null;
    if(type==='arrayBuffer') {
      if(value instanceof ArrayBuffer)return value.slice(0);
      if(value instanceof Uint8Array)return value.slice().buffer;
      return new TextEncoder().encode(JSON.stringify(value)).buffer;
    }
    return value;
  }
  async getWithMetadata(key) {
    const item=this.items.get(key);
    return item ? {data:item.value,etag:item.etag,metadata:{}} : null;
  }
  async list({prefix=''}){
    return {blobs:[...this.items.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))};
  }
}
const stores=new Map();
globalThis.__netlifyBlobs=(opts)=>{
  const name=typeof opts==='string'?opts:opts.name;
  if(!stores.has(name))stores.set(name,new Store());
  return stores.get(name);
};
globalThis.__netlifyIdentity={ getUser:async()=>loggedIn?({id:owner,email:'teste@example.com'}):null,
  verifyRequestOrigin:()=>{} };
const source=(await readFile(new URL('../netlify/functions/loops-api.mjs',import.meta.url),'utf8'))
  .replace("import { getUser, verifyRequestOrigin } from '@netlify/identity';",
    'const {getUser,verifyRequestOrigin}=globalThis.__netlifyIdentity;')
  .replace("import { getStore } from '@netlify/blobs';",
    'const getStore=globalThis.__netlifyBlobs;');
const {default:handler}=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(source));
function invoke(op,method='GET',body=null,type='application/json'){
  const request=new Request('https://loops-marks-pro.netlify.app/.netlify/functions/loops-api'+op,{method,
    headers:body!==null?{'Content-Type':type}:{},body:body===null?undefined:(typeof body==='string'?body:body)});
  return handler(request);
}
const parts=Object.fromEntries([['a',{path:owner+'/'+songId+'/'+songId+'.wav',bars:1,lengthBeats:4}]]);
const content={name:'Aliança',occasion:'Entrada',bpm:80,beats:4,parts,transitions:{},customFills:[],edit:'edit1'};
const wav=new Uint8Array(84); wav.set(new TextEncoder().encode('RIFF'),0); wav.set(new TextEncoder().encode('WAVE'),8);

test('Netlify Identity blocks unauthenticated Cloud data access',async()=>{
  loggedIn=false;
  const res=await invoke('?op=catalog'); assert.equal(res.status,401);
  loggedIn=true;
});
test('Upload saves WAV chunks and validated manifest before song sync',async()=>{
  const cloud=new Cloud();cloud.user={id:owner,email:'teste@example.com'};
  const native=globalThis.fetch;
  globalThis.fetch=(url,options={})=>handler(new Request('https://loops-marks-pro.netlify.app'+url,options));
  try {
    const path=parts.a.path;
    const bad=await invoke('?op=save','POST',JSON.stringify({id:songId,revision:0,content}));
    assert.equal(bad.status,422);
    await cloud.upload(path,{blob:new Blob([wav],{type:'audio/wav'})});
    const wav2=await cloud.audio(path);
    assert.equal(wav2.size,wav.byteLength);
    assert.deepEqual(new Uint8Array(await wav2.arrayBuffer()),wav);
    assert.equal(await cloud.save(owner,{id:songId,revision:0,...content}),1);
    const songs=await cloud.catalog();assert.equal(songs.length,1);
    assert.equal(songs[0].content.name,'Aliança');
    assert.equal(await cloud.save(owner,{id:songId,revision:1,...content,name:'Aliança Nova'}),2);
    await assert.rejects(()=>cloud.save(owner,{id:songId,revision:1,...content}),/outro aparelho/i);
    const history=await cloud.snapshots();assert.equal(history.length,1);
    await cloud.restore(history[0].key);
    const catalog=await cloud.catalog();assert.equal(catalog[0].content.name,'Aliança');
    const forbidden=await invoke('?op=audio-info&path='+encodeURIComponent('other-person/'+songId+'/'+songId+'.wav'));
    assert.equal(forbidden.status,403);
  }finally{globalThis.fetch=native;}
});
