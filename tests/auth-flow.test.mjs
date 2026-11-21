import test from 'node:test';
import assert from 'node:assert/strict';
import { Cloud } from '../dist/data.js';
import authHandler from '../netlify/functions/loops-auth.mjs';
import { credentialsValid, sessionUser, sameOrigin } from '../netlify/lib/auth.mjs';

process.env.LOOPS_ADMIN_USERNAME='marks';
process.env.LOOPS_ADMIN_PASSWORD='temporary_test_password_with_23_chars';
process.env.LOOPS_SESSION_SECRET='temporary_test_session_secret_with_48_random_characters';

const site='https://loops-marks-pro.netlify.app';
const cookies=new Map();
const memory=new Map();
Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{
  getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)
}});
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:true}});
const nativeFetch=globalThis.fetch;
const fakeFetch=async(url,opts={})=>{
  const cookie=cookies.get('cookie');
  const req=new Request(site+url,{method:opts.method||'GET',headers:{...opts.headers, ...((opts.method||'GET')==='POST'?{Origin:site}:{}),...(cookie?{Cookie:cookie}:{})},body:opts.body});
  const res=await authHandler(req);
  const setCookie=res.headers.get('set-cookie');
  if(setCookie)cookies.set('cookie',setCookie.split(';')[0]);
  return res;
};

test('login rejects invalid credential and only accepts configured username/password',async()=>{
  assert.equal(credentialsValid('marks','wrong-password'),false);
  assert.equal(credentialsValid('marks','temporary_test_password_with_23_chars'),true);
  globalThis.fetch=fakeFetch;
  try {
    const cloud=new Cloud();
    await cloud.initialize();
    assert.equal(cloud.session(),null);
    await assert.rejects(()=>cloud.signIn('marks','wrong-password'),/incorretos/);
    await cloud.signIn('marks','temporary_test_password_with_23_chars');
    assert.equal(cloud.session().id,'marks-pro-admin');
    assert.equal(cloud.session().email,'marks');
    assert.match(cookies.get('cookie'),/^__Host-loops_session=/);
    const resumed=new Cloud();
    await resumed.initialize();
    assert.equal(resumed.session().id,'marks-pro-admin');
    await resumed.signOut();
    assert.equal(resumed.session(),null);
    const afterLogout=new Cloud();
    await afterLogout.initialize();
    assert.equal(afterLogout.session(),null);
  } finally { globalThis.fetch=nativeFetch; }
});

test('no secret/configuration -> no login or permissive fallback',async()=>{
  const secret=process.env.LOOPS_SESSION_SECRET;
  delete process.env.LOOPS_SESSION_SECRET;
  try {
    assert.equal(sessionUser(new Request(site,{headers:{Cookie:cookies.get('cookie')}})),null);
    const res=await authHandler(new Request(site+'/.netlify/functions/loops-auth?op=login',{method:'POST',headers:{Origin:site,'Content-Type':'application/json'},body:JSON.stringify({username:'marks',password:'temporary_test_password_with_23_chars'})}));
    assert.equal(res.status,503);
  } finally {process.env.LOOPS_SESSION_SECRET=secret;}
});

test('server forbids cross-origin POSTs, including login',async()=>{
  const req=new Request(site+'/.netlify/functions/loops-auth?op=login',{method:'POST',headers:{Origin:'https://untrusted.example'},body:'{}'});
  assert.equal(sameOrigin(req),false);
  const res=await authHandler(req);
  assert.equal(res.status,403);
});
