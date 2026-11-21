import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const path = new URL('../dist/data.js', import.meta.url);
const original = readFileSync(path, 'utf8');
const importedSDK = original.replace(/^import \{[^\n]+\} from '\.\/netlify-client\.js';/m,
  `const { login: identityLogin, logout: identityLogout, getUser: identityGetUser,\n    handleAuthCallback, acceptInvite: identityAcceptInvite, updateUser: identityUpdateUser,\n    requestPasswordRecovery: identityRequestRecovery } = globalThis.__authTestSDK;`);

function setupSDK(auth) {
  let current = null;
  const storage = new Map();
  globalThis.localStorage = {
    getItem: k => storage.get(k) || null,
    setItem: (k,v) => storage.set(k, v),
    removeItem: k => storage.delete(k),
  };
  Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true });
  globalThis.__authTestSDK = {
    login: async () => current,
    logout: async () => {},
    getUser: async () => current,
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
    assert.match(cloud.authError,/Netlify não confirmou/);
    assert.equal(cloud.session()?.email,'user@test.com');
    assert.deepEqual(cleared, ['/']);
  } finally {
    if (previousLocation === undefined) delete globalThis.location;
    else globalThis.location = previousLocation;
    if (previousHistory === undefined) delete globalThis.history;
    else globalThis.history = previousHistory;
  }
});

test('V4 version marker is present on login and account UI', () => {
  const app = readFileSync(new URL('../dist/app.js', import.meta.url),'utf8');
  const html = readFileSync(new URL('../dist/index.html', import.meta.url),'utf8');
  assert.match(app,/const APP_VERSION = 'V4'/);
  assert.match(app,/class=\"login-footer\"/);
  assert.match(app,/version-on-mobile/);
  assert.match(app,/session-line/);
  assert.match(html,/V4/);
});

test('service worker checks the network first and retains offline fallback', () => {
  const sw = readFileSync(new URL('../dist/sw.js', import.meta.url),'utf8');
  assert.ok(sw.indexOf('await fetch(request)') < sw.indexOf('await cache.match('));
  assert.match(sw,/skipWaiting/);
});
