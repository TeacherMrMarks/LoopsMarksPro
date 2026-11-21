import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import authHandler from '../netlify/functions/loops-auth.mjs';
import * as auth from '../netlify/lib/auth.mjs';
import { Cloud } from '../dist/data.js';

process.env.LOOPS_ADMIN_USERNAME='marks';
process.env.LOOPS_ADMIN_PASSWORD='temporary_test_password_with_23_chars';
process.env.LOOPS_SESSION_SECRET='temporary_test_session_secret_with_48_random_characters';
const root='https://loops-marks-pro.netlify.app';
const owner='marks-pro-admin';
const songId='10d5b59b-95a7-478e-9a6b-69b81caf1c91';
class Store {
  constructor(){this.items=new Map();}
  async set(key,value,conditions={}){return this.setJSON(key,value,conditions);}
  async setJSON(key,value,{onlyIfNew=false,onlyIfMatch}={}){
    const old=this.items.get(key);
    if((onlyIfNew && old)||(onlyIfMatch && old?.etag!==onlyIfMatch))return {modified:false};
    const etag=String(Math.random());this.items.set(key,{value,etag});return {modified:true,etag};
  }
  async get(key,{type}={}){
    const item=this.items.get(key)?.value;
    if(item==null)return null;
    if(type==='arrayBuffer')return item instanceof ArrayBuffer?item.slice(0):item.buffer.slice(0);
    return item;
  }
  async getWithMetadata(key){const item=this.items.get(key);return item?{data:item.value,etag:item.etag}:null;}
  async list({prefix=''}){return {blobs:[...this.items.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))};}
}
const stores=new Map();
globalThis.__netlifyBlobs=opts=>{
  const key=typeof opts==='string'?opts:opts.name;
  if(!stores.has(key))stores.set(key,new Store());return stores.get(key);
};
globalThis.__localAuth=auth;
const source=(await readFile(new URL('../netlify/functions/loops-api.mjs',import.meta.url),'utf8'))
  .replace("import { sessionUser, sameOrigin } from '../lib/auth.mjs';", 'const {sessionUser,sameOrigin}=globalThis.__localAuth;')
  .replace("import { getStore } from '@netlify/blobs';",'const getStore=globalThis.__netlifyBlobs;');
const {default:handler}=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(source));
let cookie='';
function req(url,method='GET',body=null,extra={}){
  const headers={...(method!=='GET'?{Origin:root}:{}),...(cookie?{Cookie:cookie}:{}),...extra};
  return new Request(root+'/.netlify/functions/'+url,{method,headers,body});
}
async function invoke(op,method='GET',body=null,extra={}){return handler(req('loops-api'+op,method,body,extra));}
const wav=new Uint8Array(84);wav.set(new TextEncoder().encode('RIFF'),0);wav.set(new TextEncoder().encode('WAVE'),8);
const parts={a:{path:owner+'/'+songId+'/'+songId+'.wav',bars:1,lengthBeats:4}};
const content={name:'Aliança',occasion:'Entrada',bpm:80,beats:4,parts,transitions:{},customFills:[],edit:'edit1'};

test('all cloud data requires valid signed session cookie',async()=>{
  cookie='';
  assert.equal((await invoke('?op=catalog')).status,401);
  assert.equal((await invoke('?op=audio-info&path=whatever')).status,401);
  const login=await authHandler(req('loops-auth?op=login','POST',JSON.stringify({username:'marks',password:'temporary_test_password_with_23_chars'}),{'Content-Type':'application/json'}));
  assert.equal(login.status,200);
  cookie=login.headers.get('set-cookie').split(';')[0];
  assert.equal((await invoke('?op=catalog')).status,200);
  assert.equal((await handler(req('loops-api?op=catalog','GET',null,{Cookie:cookie+'fake'}))).status,401);
});

test('WAV stored in chunks, hash verified, songs synced and recoverable',async()=>{
  const native=globalThis.fetch;
  globalThis.fetch=(url,options={})=>handler(req('loops-api'+url.split('loops-api').at(-1),options.method||'GET',options.body,options.headers));
  try {
    const cloud=new Cloud();cloud.user={id:owner,email:'marks'};
    const bad=await invoke('?op=save','POST',JSON.stringify({id:songId,revision:0,content}),{'Content-Type':'application/json'});
    assert.equal(bad.status,422);
    await cloud.upload(parts.a.path,{blob:new Blob([wav],{type:'audio/wav'})});
    const audio=await cloud.audio(parts.a.path);
    assert.equal(audio.size,wav.byteLength);
    assert.deepEqual(new Uint8Array(await audio.arrayBuffer()),wav);
    assert.equal(await cloud.save(owner,{id:songId,revision:0,...content}),1);
    assert.equal((await cloud.catalog()).length,1);
    assert.equal(await cloud.save(owner,{id:songId,revision:1,...content,name:'Aliança Nova'}),2);
    const snapshots=await cloud.snapshots();assert.equal(snapshots.length,1);
    await cloud.restore(snapshots[0].key);
    assert.equal((await cloud.catalog())[0].content.name,'Aliança');
    const notOurs=await invoke('?op=audio-info&path='+encodeURIComponent('wrong/'+songId+'/'+songId+'.wav'));
    assert.equal(notOurs.status,403);
    const manifest=stores.get('loops-v3-wavs').items.get(parts.a.path+'/manifest').value;
    assert.equal(manifest.sha256,createHash('sha256').update(wav).digest('hex'));
  } finally {globalThis.fetch=native;}
});

test('server rejects manifest with mismatched SHA-256 even if all chunks arrive',async()=>{
  const name=owner+'/'+songId+'/5eec37e2-1662-4302-b8c8-2d49b33d6c46.wav';
  const chunk=await invoke('?op=chunk&path='+encodeURIComponent(name)+'&i=0','POST',wav,{'Content-Type':'application/octet-stream'});
  assert.equal(chunk.status,200);
  const res=await invoke('?op=manifest','POST',JSON.stringify({path:name,bytes:wav.byteLength,chunks:1,sha256:'0'.repeat(64)}),{'Content-Type':'application/json'});
  assert.equal(res.status,409);
});
