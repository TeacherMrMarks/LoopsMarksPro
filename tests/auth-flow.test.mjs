import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const path = new URL('../dist/data.js', import.meta.url);
const original = readFileSync(path, 'utf8');
const libSource=readFileSync(new URL('../dist/library-model.js',import.meta.url),'utf8');
const libUrl='data:text/javascript;base64,'+Buffer.from(libSource.replace("from './mixer.js';","from '"+new URL('../dist/mixer.js',import.meta.url).href+"';")).toString('base64');
const importedSDK = original.replace("from './access-mode.js';","from '"+new URL('../dist/access-mode.js',import.meta.url).href+"';").replace("from './mixer.js';","from '"+new URL('../dist/mixer.js',import.meta.url).href+"';").replace("from './library-model.js';","from '"+libUrl+"';").replace(/^import \{[^\n]+\} from '\.\/netlify-client\.js';/m,
  `const { login: identityLogin, logout: identityLogout, getUser: identityGetUser,\n    handleAuthCallback, acceptInvite: identityAcceptInvite, updateUser: identityUpdateUser,\n    requestPasswordRecovery: identityRequestRecovery, getSettings: identityGetSettings,
    refreshSession: identityRefreshSession } = globalThis.__authTestSDK;`);

function setupSDK(auth) {
  let current = null;
  const storage = new Map();
  globalThis.localStorage = {
    getItem: k => storage.get(k) || null,
    setItem: (k,v) => storage.set(k, v),
    removeItem: k => storage.delete(k),
  };
  Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true });
  globalThis.fetch = async (_url,options={}) => {
    const verified = current && !globalThis.__denyServerSession;
    return Response.json(verified ? {user:{id:current.id,email:current.email,roles:[]}} :
      {error:'Entre com uma conta autorizada no Netlify Identity.'},{status:verified?200:401});
  };
  globalThis.__authTestSDK = {
    login: async () => current,
    logout: async () => {},
    getUser: async () => current,
    getSettings: async () => ({disableSignup:true}),
    refreshSession: async () => current,
    handleAuthCallback: async () => auth,
    acceptInvite: async (token, password) => { assert.equal(token, 'token-de-convite'); assert.equal(password,'senha1234'); current = {id:'u1', email:'user@test.com'}; return current; },
    updateUser: async (payload) => { assert.deepEqual(payload, {password:'senha5678'}); current = {id:'u1', email:'user@test.com'}; return current; },
    requestPasswordRecovery: async email => { assert.equal(email, 'user@test.com'); },
  };
  if (auth?.type === 'recovery') current = {id:'u1', email:'user@test.com'};
  return { current: () => current, setCurrent: value => { current = value; }, storage };
}

async function makeCloud() {
  const module = await import(`data:text/javascript;base64,${Buffer.from(importedSDK).toString('base64')}#${Math.random()}`);
  return new module.Cloud();
}

test('recovery callback stays on password screen until password is updated', async () => {
  setupSDK({ type:'recovery', user:{id:'u1',email:'user@test.com'} });
  const cloud = await makeCloud();
  await cloud.initialize();
  assert.equal(cloud.authFlow?.type, 'recovery');
  await cloud.finishRecovery('senha5678');
  assert.equal(cloud.authFlow, null);
  assert.equal(cloud.session()?.email, 'user@test.com');
});

test('invite callback keeps one-time token in memory and accepts chosen password', async () => {
  const { storage } = setupSDK({ type:'invite', token:'token-de-convite', user:null });
  const cloud = await makeCloud();
  await cloud.initialize();
  assert.equal(cloud.authFlow?.type, 'invite');
  assert.equal(cloud.session(), null);
  assert.equal([...storage.values()].some(v => v.includes('token-de-convite')), false);
  await cloud.finishInvite('senha1234');
  assert.equal(cloud.authFlow, null);
  assert.equal(cloud.session()?.id, 'u1');
});

test('request password reset checks email and dispatches to identity', async () => {
  setupSDK(null);
  const cloud = await makeCloud();
  await assert.rejects(() => cloud.sendPasswordReset('invalid-address'), /e-mail válido/);
  await cloud.sendPasswordReset('user@test.com');
});


test('invalid recovery link does not silently open the usual application', async () => {
  const sdk = setupSDK(null);
  sdk.setCurrent({id:'u1',email:'user@test.com'});
  const previousLocation = globalThis.location;
  const previousHistory = globalThis.history;
  const cleared = [];
  globalThis.location = {hash:'#recovery_token=mock-token',pathname:'/',search:''};
  globalThis.history = {replaceState(_a,_b,url){cleared.push(url);}};
  try {
    const cloud = await makeCloud();
    await cloud.initialize();
    assert.equal(cloud.authFlow?.type,'invalid');
    assert.match(cloud.authError,/link não pôde ser confirmado/);
    assert.equal(cloud.session(), null);
    assert.deepEqual(cleared, []);
  } finally {
    if (previousLocation === undefined) delete globalThis.location;
    else globalThis.location = previousLocation;
    if (previousHistory === undefined) delete globalThis.history;
    else globalThis.history = previousHistory;
  }
});

test('V13 is identified on the login and brand UI', () => {
  const app = readFileSync(new URL('../dist/app.js', import.meta.url),'utf8');
  const html = readFileSync(new URL('../dist/index.html', import.meta.url),'utf8');
  assert.match(app,/const APP_VERSION = 'V33'/);
  assert.match(app,/class=\"login-footer\"/);
  assert.match(app,/brand-version/);
  assert.match(app,/v12-setting-user/);
  assert.match(html,/V33/);
});

test('service worker checks the network first and retains offline fallback', () => {
  const sw = readFileSync(new URL('../dist/sw.js', import.meta.url),'utf8');
  assert.ok(sw.indexOf('await fetch(request)') < sw.indexOf('await cache.match('));
  assert.match(sw,/skipWaiting/);
});

test('V7 confirmed recovery link takes priority over an existing signed-in user', async () => {
  const savedLocation = globalThis.location, savedHistory=globalThis.history;
  const changed=[];
  globalThis.location={hash:'#recovery_token=opaque-test',pathname:'/',search:''};
  globalThis.history={replaceState(_state,_title,url){changed.push(url);}};
  const sdk=setupSDK({type:'recovery',user:{id:'u1',email:'user@test.com'}});
  sdk.setCurrent({id:'u1',email:'user@test.com'});
  try {
    const cloud=await makeCloud();
    await cloud.initialize();
    assert.equal(cloud.authFlow?.type,'recovery');
    assert.equal(cloud.session(),null);
    assert.deepEqual(changed,[]);
    await cloud.finishRecovery('senha5678');
    assert.deepEqual(changed,['/']);
  } finally {
    if(savedLocation === undefined) delete globalThis.location; else globalThis.location=savedLocation;
    if(savedHistory === undefined) delete globalThis.history; else globalThis.history=savedHistory;
  }
});

test('V7 does not embed own admin username, password or session secret', () => {
  const source=readFileSync(new URL('../dist/data.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/LOOPS_ADMIN_PASSWORD|LOOPS_SESSION_SECRET|loops-auth/);
});

test('V7 accepting an invite clears the one-time link before reopening the app', async () => {
  const originalLocation=globalThis.location, originalHistory=globalThis.history;
  const clean=[];
  globalThis.location={hash:'#invite_token=token-de-convite',pathname:'/',search:''};
  globalThis.history={replaceState(_state,_title,url){clean.push(url);globalThis.location.hash='';}};
  setupSDK({type:'invite',token:'token-de-convite',user:null});
  try {
    const cloud=await makeCloud();
    await cloud.initialize();
    assert.equal(cloud.authFlow?.type,'invite');
    await cloud.finishInvite('senha1234');
    assert.equal(cloud.authFlow,null);
    assert.deepEqual(clean,['/']);
  } finally {
    if (originalLocation===undefined) delete globalThis.location; else globalThis.location=originalLocation;
    if (originalHistory===undefined) delete globalThis.history; else globalThis.history=originalHistory;
  }
});


test('V7 login must be authorized by both Identity and server session check', async () => {
  const sdk=setupSDK(null);
  sdk.setCurrent({id:'u1',email:'user@test.com'});
  globalThis.__denyServerSession=true;
  try {
    const cloud=await makeCloud();
    await assert.rejects(()=>cloud.signIn('user@test.com','senha-validada'),/Entre com uma conta autorizada/);
    assert.equal(cloud.session(),null);
  } finally {delete globalThis.__denyServerSession;}
  const cloud=await makeCloud();
  await cloud.signIn('user@test.com','senha-validada');
  assert.equal(cloud.session().id,'u1');
});

test('V7 does not trust a cached online profile without Identity session', async () => {
  const {storage}=setupSDK(null);
  storage.set('loops-marks-last-user-v3',JSON.stringify({id:'u1',email:'user@test.com',at:Date.now()}));
  const cloud=await makeCloud();
  await cloud.initialize();
  assert.equal(cloud.session(),null);
  assert.equal(storage.has('loops-marks-last-user-v3'),false);
});

test('V7 offline session is allowed only after server confirmation within 48h', async () => {
  const {storage}=setupSDK(null);
  const savedAt=Date.now();
  const navigatorValue=globalThis.navigator;
  Object.defineProperty(globalThis,'navigator',{value:{onLine:false},configurable:true});
  try {
    const fresh=await makeCloud();
    storage.set('loops-marks-last-user-v3',JSON.stringify({id:'u1',email:'user@test.com',at:savedAt}));
    await fresh.initialize();
    assert.equal(fresh.session().email,'user@test.com');
    const old=await makeCloud();
    storage.set('loops-marks-last-user-v3',JSON.stringify({id:'u1',email:'user@test.com',at:savedAt-49*60*60*1000}));
    await old.initialize();
    assert.equal(old.session(),null);
    const legacy=await makeCloud();
    storage.set('loops-marks-last-user-v3',JSON.stringify({id:'u1',email:'user@test.com'}));
    await legacy.initialize();
    assert.equal(legacy.session(),null);
  } finally {Object.defineProperty(globalThis,'navigator',{value:navigatorValue,configurable:true});}
});

test('V7 rate-limits repeated recovery requests locally and identifies rate limits from Identity',async()=>{
  let requested=0;
  const {storage}=setupSDK(null);
  globalThis.__authTestSDK.requestPasswordRecovery=async()=>{requested++;};
  const cloud=await makeCloud();
  await cloud.sendPasswordReset('user@test.com');
  await assert.rejects(()=>cloud.sendPasswordReset('user@test.com'),/solicitou um link recentemente/);
  assert.equal(requested,1);
  storage.delete('loops-marks-v7-reset-at');
  globalThis.__authTestSDK.requestPasswordRecovery=async()=>{const e=new Error('too many requests');e.status=429;throw e;};
  const secondCloud=await makeCloud();
  await assert.rejects(()=>secondCloud.sendPasswordReset('user@test.com'),/limitou temporariamente/);
});


test('V7 diagnostic recognizes Identity enabled with no logged-in session, without sending email',async()=>{
  setupSDK(null);
  const cloud=await makeCloud();
  const status=await cloud.diagnoseIdentity();
  assert.match(status,/Identity e função de sessão estão ativos/);
  assert.match(status,/Falta entrar/);
  const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
  assert.match(app,/auth-check/);
});
