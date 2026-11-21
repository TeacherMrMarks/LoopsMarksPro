export const PARTS = [
  { id: 'intro', label: 'Introdução', icon: 'spark', type: 'uma vez', group: 'loops' },
  { id: 'a', label: 'Parte A', icon: 'a', type: 'loop', group: 'loops' },
  { id: 'aEntry', label: 'Entrada Parte A · com crash', icon: 'spark', type: 'entrada', group: 'entradas' },
  { id: 'b', label: 'Parte B', icon: 'b', type: 'loop', group: 'loops' },
  { id: 'bEntry', label: 'Entrada Parte B · com crash', icon: 'spark', type: 'entrada', group: 'entradas' },
  { id: 'c', label: 'Parte C', icon: 'layers', type: 'loop', group: 'loops' },
  { id: 'cEntry', label: 'Entrada Parte C · com crash', icon: 'spark', type: 'entrada', group: 'entradas' },
  { id: 'pre', label: 'Pré-refrão', icon: 'wave', type: 'loop', group: 'loops' },
  { id: 'preEntry', label: 'Entrada Pré-refrão · com crash', icon: 'spark', type: 'entrada', group: 'entradas' },
  { id: 'chorus', label: 'Refrão', icon: 'layers', type: 'loop', group: 'loops' },
  { id: 'chorusEntry', label: 'Entrada Refrão · com crash', icon: 'spark', type: 'entrada', group: 'entradas' },
  { id: 'low', label: 'Parte baixa', icon: 'minus', type: 'loop', group: 'loops' },
  { id: 'lowEntry', label: 'Entrada Parte baixa · com crash', icon: 'spark', type: 'entrada', group: 'entradas' },
  { id: 'high', label: 'Parte alta', icon: 'current', type: 'loop', group: 'loops' },
  { id: 'highEntry', label: 'Entrada Parte alta · com crash', icon: 'spark', type: 'entrada', group: 'entradas' },
  { id: 'fillIntro', label: 'Virada da introdução', icon: 'wave', type: 'virada', group: 'automaticas' },
  { id: 'fillA', label: 'Virada para Parte A', icon: 'wave', type: 'virada', group: 'automaticas' },
  { id: 'fillB', label: 'Virada para Parte B', icon: 'wave', type: 'virada', group: 'automaticas' },
  { id: 'fillC', label: 'Virada para Parte C', icon: 'wave', type: 'virada', group: 'automaticas' },
  { id: 'fillPre', label: 'Virada para Pré-refrão', icon: 'wave', type: 'virada', group: 'automaticas' },
  { id: 'fillChorus', label: 'Virada para Refrão', icon: 'wave', type: 'virada', group: 'automaticas' },
  { id: 'fillLow', label: 'Virada para Parte baixa', icon: 'wave', type: 'virada', group: 'automaticas' },
  { id: 'fillHigh', label: 'Virada para Parte alta', icon: 'wave', type: 'virada', group: 'automaticas' },
  { id: 'fillLight', label: 'Virada leve', icon: 'wave', type: 'virada', group: 'manuais' },
  { id: 'fillStrong', label: 'Virada forte', icon: 'wave', type: 'virada', group: 'manuais' },
  { id: 'fillSpecial', label: 'Virada especial', icon: 'wave', type: 'virada', group: 'manuais' },
  { id: 'crashStop', label: 'Crash 1 · Bumbo + prato', icon: 'spark', type: 'uma vez', group: 'crashstops' },
  { id: 'crashStop2', label: 'Crash 2 · Bumbo + prato', icon: 'spark', type: 'uma vez', group: 'crashstops' },
  { id: 'crashStop3', label: 'Crash 3 · Bumbo + prato', icon: 'spark', type: 'uma vez', group: 'crashstops' },
  { id: 'finish', label: 'Acabamento', icon: 'check', type: 'uma vez', group: 'finais' },
  { id: 'outro', label: 'Final', icon: 'flag', type: 'uma vez', group: 'finais' },
];
export const extraSections = song => (song?.customSections||[]).filter(s=>/^section_[a-f0-9]{12}$/.test(s.id)&&typeof s.label==='string').map(s=>({...s,icon:'layers',group:'loops',type:'loop'}));
export const playableParts = song => [...PARTS.filter(p=>p.group==='loops'&&p.id!=='intro'),...extraSections(song)];
export const entryOf = (song,key) => key?.startsWith('section_') ? key+'Entry' : ENTRY_OF[key];
export const PLAY_PARTS = PARTS.filter(part => part.group === 'loops' && part.id !== 'intro');
// O repertório inclui todos os cadastros, mesmo os que ainda estão recebendo WAVs.
// O primeiro loop disponível inicia o player: a Parte A não é obrigatória.
export function firstPlayablePart(song) {
  return playableParts(song).find(part => Boolean(song?.parts?.[part.id]))?.id || null;
}
export function liveCatalog(rows) {
  return rows.filter(song => song && !song.deleted);
}
export const MANUAL_PARTS = PARTS.filter(part => part.group === 'manuais');
export const FINALES = PARTS.filter(part => part.group === 'finais');
export const CRASH_STOPS = PARTS.filter(part => part.group === 'crashstops');
export const FILL_IDS = new Set(PARTS.filter(part => part.type === 'virada').map(part => part.id));
export const ENTRY_OF = Object.fromEntries(PLAY_PARTS.map(part => [part.id, part.id + 'Entry']));
export const BASE_OF_ENTRY = Object.fromEntries(Object.entries(ENTRY_OF).map(([base, entry]) => [entry, base]));
export const FILL_VARIANT = /^([\w-]+)__(\d{1,3})$/;
export function fillVariantId(base, beats) { return base + '__' + beats; }
export function fillBase(id) { return id.match(FILL_VARIANT)?.[1] || id; }
export const DEFAULT_FILLS = { a: 'fillA', b: 'fillB', c: 'fillC', pre: 'fillPre', chorus: 'fillChorus', low: 'fillLow', high: 'fillHigh' };
export const MAX_FILE_BYTES = 32 * 1024 * 1024;
import { emptyLibrary, cleanLibrary, validLibrary } from './library-model.js';
import { login as identityLogin, logout as identityLogout, getUser as identityGetUser, getSettings as identityGetSettings, refreshSession as identityRefreshSession, handleAuthCallback, acceptInvite as identityAcceptInvite, updateUser as identityUpdateUser, requestPasswordRecovery as identityRequestRecovery } from './netlify-client.js';
const KEY = 'loops-marks-last-user-v3';
const STORE = 'dados';

export function newSong() {
  return { kind:'music', folderId:'', id: crypto.randomUUID(), name: '', occasion: '', bpm: 84, beats: 4, parts: {}, transitions: {}, customFills: [], fillMode: 'smart', repeatMode: 'fill', customSections: [], sequence: [], sequenceMode:'assisted', revision: 0 };
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('loops-marks-data', 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

class Disk {
  db = openDB();
  async get(key) {
    const db = await this.db;
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE).objectStore(STORE).get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  async list(prefix) {
    const db = await this.db;
    return new Promise((resolve, reject) => {
      const range = IDBKeyRange.bound(prefix, prefix + '\uffff');
      const request = db.transaction(STORE).objectStore(STORE).getAll(range);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  async clearPrefix(prefix){
    const db=await this.db;
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readwrite');
      const request=tx.objectStore(STORE).openCursor(IDBKeyRange.bound(prefix,prefix+'\uffff'));
      request.onsuccess=()=>{const cursor=request.result;if(cursor){cursor.delete();cursor.continue();}};
      tx.oncomplete=resolve;tx.onerror=tx.onabort=()=>reject(tx.error||new Error('Falha ao limpar a cópia local.'));
    });
  }
  async batch(entries) {
    if (!entries.length) return;
    const db = await this.db;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite');
      const store = transaction.objectStore(STORE);
      transaction.oncomplete = () => resolve();
      transaction.onabort = transaction.onerror = () =>
        reject(transaction.error || new Error('O aparelho não conseguiu salvar os dados.'));
      for (const [key, value] of entries) {
        if (value === undefined) store.delete(key);
        else store.put(value, key);
      }
    });
  }
}

export class CloudError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

// V7: Identity da mesma família utilizada na Central de Cifras, com verificação
// pelo servidor e sessão offline limitada. Não altera o formato dos dados V4/V6.
const OFFLINE_TTL_MS = 48 * 60 * 60 * 1000;
const RECOVERY_THROTTLE_KEY = 'loops-marks-v7-reset-at';
export function describeIdentityError(error, action = 'login') {
  if (error instanceof CloudError) return error.message;
  const status = Number(error?.status || error?.code || 0);
  const raw = String(error?.message || '').toLowerCase();
  if (status === 429 || /rate limit|too many|exceeded|limit exceeded|over limit/.test(raw))
    return 'O Netlify limitou temporariamente as tentativas. Não peça novos e-mails agora; tente novamente quando o serviço liberar.';
  if (/expired|invalid token|token expired|already used|invalid grant/.test(raw))
    return 'O link não é mais válido ou já foi usado. Utilize um único e-mail de recuperação novo quando o limite permitir.';
  if (action === 'login' && (status === 400 || status === 401 || /invalid login|invalid credentials/.test(raw)))
    return 'E-mail ou senha incorretos. Confira os dados da conta do Netlify Identity.';
  if (status === 0 || /network|fetch|timeout|failed to fetch/.test(raw))
    return 'Não foi possível contatar o Netlify Identity. Verifique a conexão e tente novamente.';
  return String(error?.message || 'Não foi possível concluir a autenticação.').slice(0, 260);
}

export class Cloud {
  enabled = true;
  constructor(){
    this.musician = typeof location !== 'undefined' && new URLSearchParams(location.search).get('modo') === 'musico';
    const requested = this.musician ? new URLSearchParams(location.search).get('chave') : null;
    // Acesso de músico limitado a leitura; nenhum segredo do administrador é enviado ao player.
    this.musicianToken = requested && /^[a-f0-9-]{36}\.[a-f0-9]{64}$/i.test(requested) ? requested : null;
    if(this.musicianToken){
      try {localStorage.setItem('loops-v12-musician-token',this.musicianToken);} catch {}
    } else if(this.musician){
      try {this.musicianToken=localStorage.getItem('loops-v12-musician-token')||null;}catch{}
    }
  }
  async musicianRequest(op,{responseType='json'}={}){
    if(!this.musicianToken)throw new CloudError('Link do músico ausente. Solicite um link novo ao administrador.',401);
    const response=await fetch('/.netlify/functions/loops-musician'+op,{
      cache:'no-store',headers:{Authorization:'Bearer '+this.musicianToken},credentials:'omit'});
    if(!response.ok){const message=await response.json().catch(()=>({}));
      throw new CloudError(message.message||'Link do músico não autorizado.',response.status);}
    return responseType==='blob'?response.blob():response.json();
  }
  async initializeMusician(){
    if(!this.musicianToken){this.authError='Link do músico incompleto ou revogado. Gere outro na Central Administrativa.';return null;}
    const cacheKey='loops-v12-musician-verified';
    if(typeof navigator!=='undefined'&&!navigator.onLine){
      try {const saved=JSON.parse(localStorage.getItem(cacheKey)||'null');
        if(saved?.token!==this.musicianToken||Date.now()-saved.at>48*3600000||
          Date.now()>Date.parse(saved.expiresAt))throw new Error('expired');
        this.user={id:'musician-'+this.musicianToken.split('.')[1].slice(0,20),email:'Músico autorizado',readonly:true};return this.user;
      }catch{this.authError='A autorização offline não está válida. Conecte à internet para verificar o link.';return null;}
    }
    try{const valid=await this.musicianRequest('?op=resolve');
      this.user={id:'musician-'+this.musicianToken.split('.')[1].slice(0,20),email:'Músico autorizado',readonly:true};
      localStorage.setItem(cacheKey,JSON.stringify({token:this.musicianToken,at:Date.now(),expiresAt:valid.expiresAt}));
      return this.user;
    }catch(e){this.authError=e.message;this.user=null;
      try{localStorage.removeItem(cacheKey);}catch{}return null;}
  }
  async linkStatus(){return this.request('?op=link-get');}
  async linkCreate(){return this.request('?op=link-create',{method:'POST'});}
  async linkRevoke(){return this.request('?op=link-revoke',{method:'POST'});}

  user = null;
  authFlow = null;
  authError = '';
  session() { return this.user; }
  async verifyServer() {
    if (typeof navigator !== 'undefined' && !navigator.onLine)
      throw new CloudError('Sem internet para confirmar a conta no servidor.', 0);
    let response;
    try {
      response = await fetch('/.netlify/functions/loops-session', {
        credentials: 'same-origin', cache: 'no-store',
        signal: typeof AbortSignal?.timeout === 'function' ? AbortSignal.timeout(15000) : undefined,
      });
    } catch (error) { throw new CloudError('Não foi possível verificar a conta no servidor do Netlify.', 0); }
    if (!(response.headers.get('content-type') || '').includes('application/json'))
      throw new CloudError('A função loops-session não está publicada. Confira o deploy da V7.', 503);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new CloudError(payload.error || 'A sessão não foi autorizada pelo Netlify.', response.status);
    if (!payload.user?.id || !payload.user?.email)
      throw new CloudError('O servidor retornou uma conta inválida.', 503);
    return { id: payload.user.id, email: payload.user.email, roles: payload.user.roles || [] };
  }
  setVerifiedUser(user) {
    this.user = { id: user.id, email: user.email, roles: user.roles || [] };
    // Sem armazenar JWT, senha ou link de recuperação; somente dados mínimos e prazo.
    try { localStorage.setItem(KEY, JSON.stringify({ ...this.user, at: Date.now() })); } catch {}
    return this.user;
  }
  async onlineSession() {
    let identityUser = await identityGetUser();
    if (!identityUser) {
      try { await identityRefreshSession(); identityUser = await identityGetUser(); }
      catch { /* Não há sessão renovável: mostrar o login. */ }
    }
    if (!identityUser?.id) return null;
    const verified = await this.verifyServer();
    if (verified.id !== identityUser.id)
      throw new CloudError('A sessão do navegador e a do servidor não coincidem. Entre novamente.', 401);
    return this.setVerifiedUser(verified);
  }
  restoreOfflineUser() {
    if (typeof navigator !== 'undefined' && navigator.onLine) return false;
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      const elapsed = Date.now() - Number(saved?.at);
      if (!saved?.id || !saved?.email || !Number.isFinite(elapsed) ||
          elapsed < -60000 || elapsed > OFFLINE_TTL_MS) return false;
      this.user = {id: saved.id, email: saved.email, roles: saved.roles || [], offline: true};
      return true;
    } catch { return false; }
  }
  async initialize() {
    if(this.musician)return this.initializeMusician();
    const hash = typeof location === 'undefined' ? '' : location.hash || '';
    const expected = /(?:^#|&)recovery_token=/.test(hash) ? 'recovery' :
      /(?:^#|&)invite_token=/.test(hash) ? 'invite' : null;
    this.authFlow = null;
    this.authError = '';
    const offline = typeof navigator !== 'undefined' && !navigator.onLine;
    if (offline) {
      if (expected) {
        this.authFlow = { type:'invalid' };
        this.authError = 'O link de convite ou recuperação precisa de internet para ser validado. Abra-o novamente quando conectar.';
      } else this.restoreOfflineUser();
      return this.user;
    }
    // Como na Central de Cifras: valida configuração, consome callback e só
    // então consulta a sessão. Não descarte o token em falha transitória.
    try { await identityGetSettings(); }
    catch (error) {
      this.authError = 'Netlify Identity indisponível ou não habilitado neste projeto. Confira Identity no painel.';
      if (expected) this.authFlow = {type:'invalid'};
      return null;
    }
    try {
      const result = await handleAuthCallback();
      if (result?.type === 'invite' && result.token) {
        this.authFlow = {type:'invite',token:result.token};
        return null;
      }
      if (result?.type === 'recovery') {
        this.authFlow = {type:'recovery'};
        return null;
      }
      if (expected) {
        this.authFlow = {type:'invalid'};
        this.authError = 'O link não pôde ser confirmado pelo Identity. Verifique se o endereço principal está na V7 e se o link ainda é válido.';
        return null;
      }
    } catch (error) {
      this.authError = describeIdentityError(error, 'callback');
      if (expected) this.authFlow = {type:'invalid'};
      else return null;
      return null;
    }
    try {
      const user = await this.onlineSession();
      if (!user) {
        this.user = null;
        // O cadastro antigo sem "at" não é prova de sessão validada.
        try { localStorage.removeItem(KEY); } catch {}
      }
    } catch (error) {
      this.user = null;
      this.authError = error.message || 'Não foi possível validar a conta no Netlify.';
    }
    return this.user;
  }
  async diagnoseIdentity() {
    if (typeof navigator !== 'undefined' && !navigator.onLine)
      return 'Sem internet. Faça a verificação quando estiver conectado.';
    try { await identityGetSettings(); }
    catch { return 'Identity não respondeu. Confira se o serviço está habilitado neste mesmo projeto Netlify.'; }
    let response;
    try { response = await fetch('/.netlify/functions/loops-session',
      {credentials:'same-origin',cache:'no-store'}); }
    catch { return 'Identity respondeu, mas não foi possível consultar a Function loops-session.'; }
    if (!(response.headers.get('content-type')||'').includes('application/json'))
      return 'Identity respondeu, mas a Function loops-session ainda não está publicada nesta versão.';
    if (response.status === 401)
      return 'Identity e função de sessão estão ativos. Falta entrar com o e-mail e a senha cadastrados.';
    if (response.ok)
      return 'Identity e função de sessão estão ativos. Há uma conta autenticada neste navegador.';
    return 'Identity respondeu; a verificação da função retornou erro HTTP ' + response.status + '. Consulte os logs do deploy.';
  }
  async sendPasswordReset(email) {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new CloudError('Digite um endereço de e-mail válido.', 400);
    // Desestimula repetição enquanto Identity impõe limite de envio.
    try {
      const last = Number(localStorage.getItem(RECOVERY_THROTTLE_KEY) || 0);
      if (Date.now() - last < 90000)
        throw new CloudError('Já solicitou um link recentemente. Confira sua caixa de entrada antes de tentar novamente.', 429);
    } catch (error) { if (error instanceof CloudError) throw error; }
    try { await identityRequestRecovery(email); }
    catch (error) { throw new CloudError(describeIdentityError(error,'reset'), Number(error?.status || 0)); }
    try { localStorage.setItem(RECOVERY_THROTTLE_KEY, String(Date.now())); } catch {}
  }
  async finishInvite(password) {
    if (this.authFlow?.type !== 'invite' || !this.authFlow.token)
      throw new CloudError('Convite não disponível. Abra o link do e-mail novamente.',400);
    try {
      const identityUser = await identityAcceptInvite(this.authFlow.token, password);
      if (!identityUser?.id) throw new CloudError('O Netlify não confirmou a criação da conta.',401);
      await identityRefreshSession();
      const user = await this.verifyServer();
      if (user.id !== identityUser.id) throw new CloudError('As contas não coincidem.',401);
      this.setVerifiedUser(user);
    } catch (error) { throw new CloudError(describeIdentityError(error, 'invite'),error?.status || 0); }
    this.authFlow = null;
    this.authError = '';
    this.clearAuthFragment();
    return this.user;
  }
  async finishRecovery(password) {
    if (this.authFlow?.type !== 'recovery')
      throw new CloudError('Abra um link de recuperação válido.',400);
    try { await identityUpdateUser({password}); }
    catch (error) { throw new CloudError(describeIdentityError(error,'recovery'),error?.status || 0); }
    this.authFlow = null;
    this.clearAuthFragment();
    try {
      await identityRefreshSession();
      const user = await this.onlineSession();
      if (!user) throw new Error('Sessão não foi renovada');
      this.authError = '';
      return user;
    } catch {
      // A senha foi alterada com sucesso; não pedir outro e-mail por um problema
      // de sessão subsequente. O usuário pode entrar normalmente com a nova senha.
      this.user = null;
      this.authError = 'Senha alterada. Entre com seu e-mail e a nova senha para confirmar o acesso.';
      return null;
    }
  }
  clearAuthFragment() {
    if (typeof history !== 'undefined' && typeof location !== 'undefined' &&
        /(?:^#|&)(?:invite_token|recovery_token)=/.test(location.hash || ''))
      history.replaceState(null, '', location.pathname + location.search);
  }
  async signIn(email,password) {
    try {
      const identityUser = await identityLogin(email,password);
      if (!identityUser?.id) throw new CloudError('O Identity não confirmou o login.',401);
      const verified = await this.verifyServer();
      if (verified.id !== identityUser.id)
        throw new CloudError('A conta validada pelo servidor não coincide com a sessão.',401);
      return this.setVerifiedUser(verified);
    } catch (error) {
      throw new CloudError(describeIdentityError(error,'login'),error?.status || error?.code || 0);
    }
  }
  async signOut() {
    this.authFlow = null; this.authError = '';
    try { await identityLogout(); }
    finally {
      this.user = null;
      try { localStorage.removeItem(KEY); } catch {}
    }
  }
  async ready() {
    if (!this.user) throw new CloudError('Entre para acessar sua biblioteca.',401);
    return this.user;
  }
  async request(op, { method='GET',body,headers={},responseType='json' }={}) {
    await this.ready();
    if(this.musician){
      if(method!=='GET'||!/^\?op=(catalog|library|audio-info|audio-chunk)(?:&|$)/.test(op))
        throw new CloudError('O acesso do músico permite somente reprodução e downloads.',403);
      return this.musicianRequest(op,{responseType});
    }
    const url='/.netlify/functions/loops-api'+op;
    let res;
    try {res=await fetch(url,{method,body,headers:{...headers},cache:'no-store',credentials:'same-origin'});}
    catch {throw new CloudError('Sem conexão com o Netlify. Dados permanecem no aparelho.',0);}
    if (!res.ok) {
      const error=await res.json().catch(()=>({}));
      throw new CloudError(error.message || 'Netlify não concluiu a operação.',res.status);
    }
    return responseType==='blob'?res.blob():res.json();
  }
  catalog() { return this.request('?op=catalog'); }
  async save(owner, song) {
    const { id, revision, name, occasion, bpm, beats, parts, transitions, customFills, customSections, sequence, sequenceMode, fillMode, repeatMode, kind, folderId, deleted, edit } = song;
    const content = deleted ? {deleted: true, edit} :
      {name, occasion, bpm, beats, kind:kind||'music', folderId:folderId||'', parts, transitions: transitions || {}, customFills: customFills || [], customSections:customSections||[], sequence:sequence||[], sequenceMode:sequenceMode||'assisted', fillMode: fillMode || 'smart', repeatMode: repeatMode || 'fill', edit};
    const data = await this.request('?op=save', { method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({id, revision, content}) });
    return data.row_version;
  }
  async upload(path, entry) {
    const chunkSize = 1024 * 1024 * 1.5;
    const blob = entry.blob;
    if (!blob || blob.size > MAX_FILE_BYTES || blob.size < 44) throw new Error('WAV inválido (máximo 32 MB).');
    const count = Math.ceil(blob.size / chunkSize);
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())))
      .map(x => x.toString(16).padStart(2,'0')).join('');
    for (let i=0; i<count; i++) {
      const slice = blob.slice(i*chunkSize, Math.min(blob.size,(i+1)*chunkSize));
      await this.request('?op=chunk&path='+encodeURIComponent(path)+'&i='+i, {
        method:'POST', headers:{'Content-Type':'application/octet-stream'}, body:slice });
    }
    await this.request('?op=manifest', {method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({path, chunks:count, bytes:blob.size, sha256:hash})});
  }
  async audio(path) {
    const q = encodeURIComponent(path);
    const info = await this.request('?op=audio-info&path='+q);
    if (!info?.chunks || info.bytes > MAX_FILE_BYTES) throw new Error('Áudio indisponível ou inválido na nuvem.');
    const pieces = [];
    for (let i=0; i<info.chunks; i++) pieces.push(await this.request(
      '?op=audio-chunk&path='+q+'&i='+i, { responseType:'blob' }));
    const audio = new Blob(pieces, {type:'audio/wav'});
    if (audio.size !== info.bytes) throw new Error('Download incompleto: tamanho do WAV não confere.');
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await audio.arrayBuffer())))
      .map(x=>x.toString(16).padStart(2,'0')).join('');
    if (hash !== info.sha256) throw new Error('Integridade do WAV não confere. Baixe novamente.');
    return audio;
  }
  library() { return this.request('?op=library'); }
  saveLibrary(library) {
    return this.request('?op=library-save',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({revision:library.revision||0,content:cleanLibrary(library)})});
  }
  snapshots() { return this.request('?op=snapshots'); }
  restore(key) { return this.request('?op=restore', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key})}); }
}

export class Repository {
  disk = new Disk();
  constructor(cloud) {
    this.cloud = cloud;
    this.owner = cloud.session()?.id || 'demo';
  }
  key(kind, id = '') { return this.owner + '/' + kind + '/' + id; }
  async purgeMusicianCache(){if(this.cloud.musician)await this.disk.clearPrefix(this.owner+'/');}
  song(id) { return this.disk.get(this.key('song', id)); }
  async libraryState() { return await this.disk.get(this.key('settings','library')) || emptyLibrary(); }
  async saveLibrary(next) {
    const saved=await this.libraryState();
    const content={...cleanLibrary(next),revision:saved.revision||0,dirty:true};
    if(!validLibrary(content)) throw new Error('Pastas ou repertórios inválidos.');
    await this.disk.batch([[this.key('settings','library'),content]]);
    return content;
  }
  async syncLibrary() {
    const key=this.key('settings','library');
    const local=await this.libraryState();
    const remote=await this.cloud.library();
    if(!local.dirty){
      await this.disk.batch([[key,{...cleanLibrary(remote.content),revision:remote.revision||0,dirty:false}]]);
      return;
    }
    if((remote.revision||0)!==(local.revision||0)) {
      throw new Error('Pastas/repertórios alterados em outro aparelho. Reabra a Central antes de editar novamente; sua cópia local foi preservada.');
    }
    const saved=await this.cloud.saveLibrary(local);
    const latest=await this.libraryState();
    if(JSON.stringify(cleanLibrary(latest))===JSON.stringify(cleanLibrary(local)))
      await this.disk.batch([[key,{...cleanLibrary(latest),revision:saved.revision,dirty:false}]]);
    else await this.disk.batch([[key,{...latest,revision:saved.revision,dirty:true}]]);
  }
  catalog() { return this.disk.list(this.key('song')); }
  offline(id) { return this.disk.get(this.key('offline', id)); }
  async save(song, newFiles = []) {
    const next = { ...song, dirty: this.cloud.enabled, edit: crypto.randomUUID() };
    const entries = newFiles.map(([path, blob]) => [this.key('audio', path), { blob, uploaded: false }]);
    entries.push([this.key('song', song.id), next]);
    await this.disk.batch(entries);
    return next;
  }
  async audio(path) { return (await this.disk.get(this.key('audio', path)))?.blob; }
  async available(song) {
    for (const part of Object.values(song.parts || {})) {
      if (!(await this.audio(part.path))) return false;
    }
    return Boolean(Object.keys(song.parts || {}).length);
  }
  async download(song, notify) {
    const parts = Object.values(song.parts || {});
    if (!parts.length) throw new Error('Cadastre os áudios desta música antes de baixar.');
    const entries = [];
    for (const [i, part] of parts.entries()) {
      if (!(await this.audio(part.path))) {
        const blob = await this.cloud.audio(part.path);
        entries.push([this.key('audio', part.path), { blob, uploaded: true }]);
      }
      notify?.(i + 1, parts.length);
    }
    entries.push([this.key('offline', song.id), song]);
    await this.disk.batch(entries);
    navigator.storage?.persist?.().catch(() => {});
  }
  async removeDownload(song) {
    const keys = [[this.key('offline', song.id), undefined]];
    const current = await this.song(song.id);
    for (const part of Object.values(song.parts || {})) {
      const audio = await this.disk.get(this.key('audio', part.path));
      if (audio?.uploaded && (!current?.dirty ||
          !Object.values(current.parts || {}).some(candidate => candidate.path === part.path))) {
        keys.push([this.key('audio', part.path), undefined]);
      }
    }
    await this.disk.batch(keys);
  }
  async importV2Demo() {
    const rows = await this.disk.list('demo/song/');
    let count = 0;
    for (const old of rows.filter(r => !r.deleted && !r.demo)) {
      const song = { ...structuredClone(old), id: crypto.randomUUID(), revision: 0, dirty: true, edit: crypto.randomUUID() };
      const files = [];
      const parts = {};
      for (const [part, item] of Object.entries(old.parts || {})) {
        if (!item.path) continue;
        const source = await this.disk.get('demo/audio/' + item.path);
        if (!source?.blob) continue;
        const path = this.owner + '/' + song.id + '/' + crypto.randomUUID() + '.wav';
        parts[part] = {...item, path};
        files.push([path, source.blob]);
      }
      song.parts = parts;
      await this.save(song, files);
      count++;
    }
    return count;
  }
  async replaceWithRemote(local, keepLocal) {
    if (!local.conflict) return;
    const record = keepLocal
      ? { ...local, revision: local.conflict.revision, conflict: null, dirty: true, edit: crypto.randomUUID() }
      : local.conflict;
    await this.disk.batch([[this.key('song', local.id), record]]);
  }
  async sync() {
    if (!this.cloud.enabled || !navigator.onLine) return;
    const rows = await this.cloud.catalog();
    const records = new Map(rows.map(row => [row.id,
      { ...row.content, id: row.id, revision: row.row_version }]));
    if(this.cloud.musician){
      await this.disk.batch([...records.values()].map(row => [this.key('song',row.id),{...row,dirty:false}]));
      const library=await this.cloud.library();
      await this.disk.batch([[this.key('settings','library'),{...cleanLibrary(library.content),revision:library.revision||0,dirty:false}]]);
      return;
    }
    for (const local of await this.catalog()) {
      const remote = records.get(local.id);
      records.delete(local.id);
      if (!local.dirty) {
        if (remote && local.revision !== remote.revision) {
          await this.disk.batch([[this.key('song', local.id), remote]]);
        }
        continue;
      }
      if (remote?.edit && remote.edit === local.edit) {
        await this.finishSave(local, remote.revision);
        continue;
      }
      if (remote && remote.revision !== local.revision) {
        const current = await this.song(local.id);
        if (current?.dirty) await this.disk.batch([[this.key('song', local.id), { ...current, conflict: remote }]]);
        continue;
      }
      if (local.conflict) continue;
      for (const part of Object.values(local.deleted ? {} : local.parts || {})) {
        const key = this.key('audio', part.path);
        const entry = await this.disk.get(key);
        if (entry && !entry.uploaded) {
          await this.cloud.upload(part.path, entry);
          await this.disk.batch([[key, { ...entry, uploaded: true }]]);
        }
      }
      const revision = await this.cloud.save(this.owner, local);
      await this.finishSave(local, revision);
    }
    await this.disk.batch([...records.values()].map(row => [this.key('song', row.id), row]));
    await this.syncLibrary();
  }
  async finishSave(local, revision) {
    const latest = await this.song(local.id);
    if (!latest || latest.revision > revision) return;
    const next = { ...latest, revision, dirty: latest.edit !== local.edit, conflict: null };
    await this.disk.batch([[this.key('song', local.id), next]]);
  }
}
