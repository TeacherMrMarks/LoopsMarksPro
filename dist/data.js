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
const BUCKET = 'loops-audio';
const KEY = 'loops-marks-session';
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

export class Cloud {
  constructor({ supabaseUrl = '', supabaseKey = '' } = {}) {
    this.url = supabaseUrl.trim().replace(/\/$/, '');
    this.key = supabaseKey.trim();
    this.enabled = Boolean(this.url && this.key);
  }
  session() {
    if (!this.enabled) return null;
    try {
      const session = JSON.parse(localStorage.getItem(KEY));
      return session?.project === this.url ? session : null;
    } catch {
      return null;
    }
  }
  forget() {
    localStorage.removeItem(KEY);
  }
  authResult(data) {
    const session = {
      project: this.url, access_token: data.access_token, refresh_token: data.refresh_token,
      id: data.user.id, email: data.user.email,
      expires: Date.now() + Number(data.expires_in || 3600) * 1000,
    };
    localStorage.setItem(KEY, JSON.stringify(session));
    return session;
  }
  async raw(path, { token, body, headers, signal, ...options } = {}) {
    const init = { ...options, body, headers: { apikey: this.key, ...headers },
      signal: signal || AbortSignal.timeout(60000) };
    if (token) init.headers.Authorization = 'Bearer ' + token;
    let result;
    try {
      result = await fetch(this.url + path, init);
    } catch {
      throw new CloudError('Conexão indisponível. A central tentará novamente.', 0);
    }
    if (!result.ok) {
      const error = await result.json().catch(() => ({}));
      throw new CloudError(error.msg || error.message || error.error_description ||
        error.error || 'A central recusou a operação.', result.status);
    }
    return result;
  }
  async signIn(email, password) {
    const response = await this.raw('/auth/v1/token?grant_type=password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return this.authResult(await response.json());
  }
  async signOut() {
    const token = this.session()?.access_token;
    this.forget();
    if (token) await this.raw('/auth/v1/logout?scope=local', {
      token, method: 'POST', signal: AbortSignal.timeout(4000),
    }).catch(() => {});
  }
  async ready() {
    const session = this.session();
    if (!session) throw new CloudError('Entre novamente para acessar a central.', 401);
    if (session.expires > Date.now() + 90000) return session;
    if (this.refreshing) return this.refreshing;
    const refresh = async () => {
      const latest = this.session();
      if (!latest) throw new CloudError('Entre novamente para acessar a central.', 401);
      if (latest.expires > Date.now() + 90000) return latest;
      try {
        const response = await this.raw('/auth/v1/token?grant_type=refresh_token', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: latest.refresh_token }),
        });
        const data = await response.json();
        if (this.session()?.refresh_token !== latest.refresh_token) {
          const current = this.session();
          if (current) return current;
          throw new CloudError('Sessão encerrada.', 401);
        }
        return this.authResult(data);
      } catch (error) {
        if ([400, 401, 403].includes(error.code) &&
            this.session()?.refresh_token === latest.refresh_token) this.forget();
        throw error;
      }
    };
    this.refreshing = navigator.locks?.request(KEY, refresh) || refresh();
    try { return await this.refreshing; }
    finally { this.refreshing = null; }
  }
  async request(path, options) {
    const session = await this.ready();
    return this.raw(path, { ...options, token: session.access_token });
  }
  async catalog() {
    const rows = [];
    for (let offset = 0; ; offset += 250) {
      const result = await this.request('/rest/v1/loops_songs?select=id,row_version,content&order=id&limit=250&offset=' + offset);
      const page = await result.json();
      rows.push(...page);
      if (page.length < 250) return rows;
    }
  }
  async save(owner, song) {
    const { id, revision, name, occasion, bpm, beats, parts, transitions, customFills, deleted, edit } = song;
    const content = deleted ? { deleted: true, edit } : { name, occasion, bpm, beats, parts, transitions: transitions || {}, customFills: customFills || [], edit };
    const query = revision ? '?id=eq.' + id + '&user_id=eq.' + owner + '&row_version=eq.' + revision : '';
    const result = await this.request('/rest/v1/loops_songs' + query, {
      method: revision ? 'PATCH' : 'POST',
      headers: { Prefer: 'return=representation', 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, user_id: owner, row_version: revision + 1,
        updated_at: new Date().toISOString(), content }),
    });
    const [row] = await result.json();
    if (!row) throw new CloudError('Esta música foi alterada em outro aparelho.', 409);
    return row.row_version;
  }
  async upload(path, entry) {
    await this.request('/storage/v1/object/' + BUCKET + '/' + path, {
      method: 'POST', headers: { 'Content-Type': 'audio/wav', 'x-upsert': 'true' },
      body: entry.blob, signal: AbortSignal.timeout(180000),
    });
  }
  async audio(path) {
    const response = await this.request('/storage/v1/object/authenticated/' + BUCKET + '/' + path, {
      signal: AbortSignal.timeout(180000),
    });
    return response.blob();
  }
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
