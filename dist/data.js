export const PARTS = [
  { id: 'intro', label: 'Introdução', icon: 'spark', type: 'uma vez', group: 'loops' },
  { id: 'a', label: 'Parte A', icon: 'a', type: 'loop', group: 'loops' },
  { id: 'b', label: 'Parte B', icon: 'b', type: 'loop', group: 'loops' },
  { id: 'c', label: 'Parte C', icon: 'layers', type: 'loop', group: 'loops' },
  { id: 'pre', label: 'Pré-refrão', icon: 'wave', type: 'loop', group: 'loops' },
  { id: 'chorus', label: 'Refrão', icon: 'layers', type: 'loop', group: 'loops' },
  { id: 'low', label: 'Parte baixa', icon: 'minus', type: 'loop', group: 'loops' },
  { id: 'high', label: 'Parte alta', icon: 'current', type: 'loop', group: 'loops' },
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
  { id: 'finish', label: 'Acabamento', icon: 'check', type: 'uma vez', group: 'finais' },
  { id: 'outro', label: 'Final', icon: 'flag', type: 'uma vez', group: 'finais' },
];
export const PLAY_PARTS = PARTS.filter(part => part.group === 'loops' && part.id !== 'intro');
export const MANUAL_PARTS = PARTS.filter(part => part.group === 'manuais');
export const FINALES = PARTS.filter(part => part.group === 'finais');
export const FILL_IDS = new Set(PARTS.filter(part => part.type === 'virada').map(part => part.id));
export const DEFAULT_FILLS = { a: 'fillA', b: 'fillB', c: 'fillC', pre: 'fillPre', chorus: 'fillChorus', low: 'fillLow', high: 'fillHigh' };
export const MAX_FILE_BYTES = 32 * 1024 * 1024;
import { login as identityLogin, logout as identityLogout, getUser as identityGetUser, handleAuthCallback, acceptInvite as identityAcceptInvite, updateUser as identityUpdateUser, requestPasswordRecovery as identityRequestRecovery } from './netlify-client.js';
const KEY = 'loops-marks-last-user-v3';
const STORE = 'dados';

export function newSong() {
  return { id: crypto.randomUUID(), name: '', occasion: '', bpm: 84, beats: 4, parts: {}, transitions: {}, customFills: [], revision: 0 };
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

// V3: Login do Netlify Identity e armazenamento exclusivamente no Netlify Blobs.
// Os cookies de sessão são controlados pelo SDK oficial do Identity.
export class Cloud {
  enabled = true;
  user = null;
  authFlow = null;
  authError = '';
  constructor() {}
  session() { return this.user; }
  async initialize() {
    // The Identity links contain short-lived invite/recovery tokens in the URL hash.
    // Consume on load and *keep the action visible* until the user sets their password.
    // Never store tokens in localStorage or send them to the server logs.
    this.authError = '';
    try {
      const callback = await handleAuthCallback();
      if (callback?.type === 'invite' && callback.token) {
        this.authFlow = { type: 'invite', token: callback.token };
      } else if (callback?.type === 'recovery') {
        this.authFlow = { type: 'recovery' };
      } else this.authFlow = null;
    } catch (e) {
      this.authError = 'O link de acesso não pôde ser validado. Solicite um novo e-mail no painel Netlify.';
      console.warn('Identity callback não concluído:', e?.name || 'falha');
    }
    try {
      const user = await identityGetUser();
      if (user?.id) {
        this.user = { id: user.id, email: user.email, roles: user.roles || [] };
        localStorage.setItem(KEY, JSON.stringify(this.user));
      } else if (!navigator.onLine) this.restoreOfflineUser();
      else { this.user = null; localStorage.removeItem(KEY); }
    } catch (e) {
      if (!this.restoreOfflineUser()) throw new CloudError('Não foi possível validar o login. Verifique a conexão.', 0);
    }
    return this.user;
  }
  restoreOfflineUser() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      if (saved?.id && saved?.email) { this.user = saved; return true; }
    } catch {}
    return false;
  }
  async sendPasswordReset(email) {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new CloudError('Digite um endereço de e-mail válido.', 400);
    }
    await identityRequestRecovery(email);
  }
  async finishInvite(password) {
    if (this.authFlow?.type !== 'invite' || !this.authFlow.token) {
      throw new CloudError('Convite não disponível. Abra novamente o link recebido por e-mail.', 400);
    }
    const user = await identityAcceptInvite(this.authFlow.token, password);
    if (!user?.id) throw new CloudError('Não foi possível concluir o convite.', 400);
    this.user = { id: user.id, email: user.email, roles: user.roles || [] };
    localStorage.setItem(KEY, JSON.stringify(this.user));
    this.authFlow = null;
    this.authError = '';
    return this.user;
  }
  async finishRecovery(password) {
    if (this.authFlow?.type !== 'recovery') {
      throw new CloudError('Solicite um novo link para alterar sua senha.', 400);
    }
    const user = await identityUpdateUser({ password });
    const current = user?.id ? user : await identityGetUser();
    if (!current?.id) throw new CloudError('Senha alterada, mas a sessão precisa ser confirmada. Entre com sua nova senha.', 401);
    this.user = { id: current.id, email: current.email, roles: current.roles || [] };
    localStorage.setItem(KEY, JSON.stringify(this.user));
    this.authFlow = null;
    this.authError = '';
    return this.user;
  }
  async signIn(email, password) {
    const user = await identityLogin(email, password);
    if (!user?.id) throw new CloudError('Não foi possível confirmar o login do Netlify Identity.', 401);
    this.user = { id: user.id, email: user.email, roles: user.roles || [] };
    localStorage.setItem(KEY, JSON.stringify(this.user));
    return this.user;
  }
  async signOut() {
    this.authFlow = null;
    this.authError = '';
    this.user = null;
    localStorage.removeItem(KEY);
    await identityLogout().catch(e => console.warn('Logout remoto:',e));
  }
  async ready() {
    if (!this.user) throw new CloudError('Entre para acessar sua biblioteca.', 401);
    return this.user;
  }
  async request(op, { method = 'GET', body, headers = {}, responseType = 'json' } = {}) {
    await this.ready();
    const url = '/.netlify/functions/loops-api' + op;
    let res;
    try { res = await fetch(url, { method, body, headers: { ...headers }, cache: 'no-store', credentials: 'same-origin' }); }
    catch { throw new CloudError('Sem conexão com o Netlify. Dados permanecem no aparelho.', 0); }
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new CloudError(error.message || 'Netlify não concluiu a operação.', res.status);
    }
    return responseType === 'blob' ? res.blob() : res.json();
  }
  catalog() { return this.request('?op=catalog'); }
  async save(owner, song) {
    const { id, revision, name, occasion, bpm, beats, parts, transitions, customFills, deleted, edit } = song;
    const content = deleted ? {deleted: true, edit} :
      {name, occasion, bpm, beats, parts, transitions: transitions || {}, customFills: customFills || [], edit};
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
  song(id) { return this.disk.get(this.key('song', id)); }
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
  }
  async finishSave(local, revision) {
    const latest = await this.song(local.id);
    if (!latest || latest.revision > revision) return;
    const next = { ...latest, revision, dirty: latest.edit !== local.edit, conflict: null };
    await this.disk.batch([[this.key('song', local.id), next]]);
  }
}
