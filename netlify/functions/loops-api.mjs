import { getUser, verifyRequestOrigin } from '@netlify/identity';
import { getStore } from '@netlify/blobs';
import {randomBytes,createHash} from 'node:crypto';

const accessStore = () => getStore({name:'loops-v12-access',consistency:'strong'});
const libraryStore = () => getStore({name:'loops-v11-library',consistency:'strong'});
const songStore = () => getStore({name: 'loops-v3-songs', consistency: 'strong'});
const audioStore = () => getStore({name: 'loops-v3-wavs', consistency: 'strong'});
const snapStore = () => getStore({name: 'loops-v3-history', consistency: 'strong'});
const MAX_AUDIO = 32 * 1024 * 1024;
const CHUNK_LIMIT = 1_572_864;
const json = (data, status=200) => Response.json(data, {status, headers:{'Cache-Control':'no-store'}});
const fail = (message, status=400) => json({message},status);
import { validLibrary, cleanLibrary } from '../../dist/library-model.js';
const uuid = id => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f-]{26,38}$/i.test(id);
function validAudio(path, owner) {
  return typeof path==='string' && path.startsWith(owner+'/') &&
    /^[0-9a-z-]{8,100}\/[0-9a-f-]{30,40}\/[0-9a-f-]{30,40}\.wav$/i.test(path);
}
function validateContent(content, owner) {
  if (!content || typeof content!=='object' || Array.isArray(content)) return false;
  if (content.deleted === true) return true;
  if (typeof content.name !== 'string' || content.name.length>90 ||
      typeof content.occasion!=='string' || content.occasion.length>55 ||
      !Number.isFinite(content.bpm) || content.bpm<30 || content.bpm>280 ||
      !Number.isInteger(content.beats) || content.beats<2 || content.beats>6 ||
      !content.parts || typeof content.parts!=='object' || Array.isArray(content.parts)) return false;
  if ((content.kind && !['music','rhythm'].includes(content.kind)) ||
      (content.folderId && !uuid(content.folderId))) return false;
  if (Object.keys(content.parts).length>250) return false;
  for (const [key, part] of Object.entries(content.parts)) {
    if (!/^[\w-]{1,80}$/.test(key) || !part || !validAudio(part.path, owner) ||
        !Number.isFinite(part.bars) || part.bars<0 || part.bars>128) return false;
  }
  if (Object.keys(content.transitions||{}).length>140 || (content.customFills||[]).length>50 ||
      (content.fillMode && !['smart','full'].includes(content.fillMode)) ||
      (content.repeatMode && !['fill','direct'].includes(content.repeatMode)) ||
      (content.sequenceMode && !['automatic','assisted'].includes(content.sequenceMode))) return false;
  const extra=content.customSections||[];
  if(!Array.isArray(extra)||extra.length>36||extra.some(s=>!/^section_[a-f0-9]{12}$/.test(s?.id||'')||typeof s.label!=='string'||!s.label.trim()||s.label.length>52))return false;
  const stages=content.sequence||[];
  if(!Array.isArray(stages)||stages.length>120||stages.some(s=> !/^[a-zA-Z0-9_-]{1,50}$/.test(s?.part||'')||!Number.isInteger(s.repeats)||s.repeats<0||s.repeats>32||!Number.isInteger(s.jumpTo??-1)|| (s.jumpTo??-1)<-1|| (s.jumpTo??-1)>=stages.length))return false;
  return true;
}
export default async function handler(req) {
  try {
    const user = await getUser();
    if (!user?.id) return fail('Entre na sua conta do Netlify Identity.',401);
    const owner = user.id;
    const url = new URL(req.url), op=url.searchParams.get('op') || '';
    if (req.method!=='GET') verifyRequestOrigin(req);
    // Links de músico: token forte, somente leitura; revogação no servidor.
    if(req.method==='GET' && op==='link-get'){
      const row=await accessStore().get(owner+'/current',{type:'json',consistency:'strong'});
      return json(row?.active&&Date.now()<Date.parse(row.expiresAt)?{
        active:true,token:row.token,createdAt:row.createdAt,expiresAt:row.expiresAt}:{active:false});
    }
    if(req.method==='POST' && op==='link-create'){
      const token=owner+'.'+randomBytes(32).toString('hex');
      const row={active:true,token,sha256:createHash('sha256').update(token).digest('hex'),
        createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+90*86400000).toISOString()};
      await accessStore().setJSON(owner+'/current',row);
      return json({active:true,token:row.token,createdAt:row.createdAt,expiresAt:row.expiresAt});
    }
    if(req.method==='POST' && op==='link-revoke'){
      const row=await accessStore().get(owner+'/current',{type:'json',consistency:'strong'});
      if(row){await accessStore().setJSON(owner+'/current',{...row,active:false,revokedAt:new Date().toISOString()});}
      return json({active:false});
    }
    if (req.method==='GET' && op==='library') {
      const doc=await libraryStore().get(owner+'/index',{type:'json',consistency:'strong'});
      return json(doc || {revision:0,content:{folders:[],repertoires:[]}});
    }
    if (req.method==='POST' && op==='library-save') {
      if(Number(req.headers.get('content-length')||0)>160000)return fail('Biblioteca muito grande.',413);
      const {revision,content}=await req.json();
      if(!Number.isSafeInteger(revision)||revision<0||!validLibrary(content)||
        JSON.stringify(content).length>130000) return fail('Pastas e repertórios inválidos.',400);
      const store=libraryStore(),key=owner+'/index';
      const current=await store.getWithMetadata(key,{type:'json',consistency:'strong'});
      if((current?.data?.revision||0)!==revision)return fail('Biblioteca alterada em outro aparelho.',409);
      const row={revision:revision+1,content:cleanLibrary(content)};
      const saved=await store.setJSON(key,row,current?{onlyIfMatch:current.etag}:{onlyIfNew:true});
      if(!saved.modified)return fail('Biblioteca modificada. Sincronize novamente.',409);
      return json({revision:row.revision});
    }
    if (req.method==='GET' && op==='catalog') {
      const store = songStore();
      const list=await store.list({prefix:owner+'/',paginate:false});
      const rows=await Promise.all(list.blobs.map(async entry => await store.get(entry.key,{type:'json',consistency:'strong'})));
      return json(rows.filter(Boolean));
    }
    if (req.method==='POST' && op==='save') {
      if (Number(req.headers.get('content-length')||0)>300000) return fail('Cadastro muito grande.',413);
      const {id,revision,content}=await req.json();
      if (!uuid(id) || !Number.isSafeInteger(revision) || revision<0 ||
          !validateContent(content,owner) || JSON.stringify(content).length>250000) return fail('Dados da música inválidos.',400);
      const store=songStore(), key=owner+'/'+id;
      const current=await store.getWithMetadata(key,{type:'json',consistency:'strong'});
      const existing=current?.data;
      if ((existing?.row_version||0)!==revision) return fail('Esta música foi editada em outro aparelho.',409);
      // Exigir que os áudios tenham manifesto completo antes de publicá-los.
      if (!content.deleted) for (const part of Object.values(content.parts)) {
        if (!await audioStore().get(part.path+'/manifest',{type:'json',consistency:'strong'})) {
          return fail('Aguarde o envio completo dos arquivos WAV antes da sincronização.',422);
        }
      }
      const row={id,row_version:revision+1,content,updated_at:new Date().toISOString()};
      const done=await store.setJSON(key,row,current ? {onlyIfMatch:current.etag}:{onlyIfNew:true});
      if (!done.modified) return fail('Conflito de edição detectado. Sincronize novamente.',409);
      if (existing) {
        const stamp=new Date().toISOString().replace(/[:.]/g,'-');
        // Snapshot da versão anterior, incluindo referências aos WAVs retidos no storage.
        await snapStore().setJSON(owner+'/'+id+'/'+stamp,existing);
      }
      return json({row_version:row.row_version});
    }
    if (req.method==='POST' && op==='chunk') {
      const path=url.searchParams.get('path');
      const i=Number(url.searchParams.get('i'));
      if (!validAudio(path,owner) || !Number.isInteger(i) || i<0 || i>32) return fail('Caminho inválido.',400);
      const size=Number(req.headers.get('content-length') || 0);
      if (size > CHUNK_LIMIT) return fail('Bloco deve ter no máximo 1,5 MB.',413);
      const buffer=await req.arrayBuffer();
      if (!buffer.byteLength || buffer.byteLength>CHUNK_LIMIT) return fail('Bloco de áudio inválido.',413);
      await audioStore().set(path+'/part-'+i,buffer);
      return json({ok:true,index:i});
    }
    if (req.method==='POST' && op==='manifest') {
      const {path,chunks,bytes,sha256}=await req.json();
      if (!validAudio(path,owner) || !Number.isSafeInteger(bytes) || bytes<44 || bytes>MAX_AUDIO ||
          !Number.isInteger(chunks)||chunks<1||chunks>22|| !/^[a-f0-9]{64}$/.test(sha256)) return fail('Manifesto inválido.',400);
      const store=audioStore(); let sum=0;
      for(let i=0;i<chunks;i++) {
        const binary=await store.get(path+'/part-'+i,{type:'arrayBuffer',consistency:'strong'});
        if (!binary || !binary.byteLength || binary.byteLength>CHUNK_LIMIT) return fail('Falta enviar um dos blocos do WAV.',409);
        sum+=binary.byteLength;
      }
      if (sum!==bytes) return fail('O tamanho dos blocos não confere.',409);
      await store.setJSON(path+'/manifest',{path,chunks,bytes,sha256});
      return json({ok:true});
    }
    if (req.method==='GET' && ['audio-info','audio-chunk'].includes(op)) {
      const path=url.searchParams.get('path');
      if (!validAudio(path,owner)) return fail('Sem permissão para acessar este áudio.',403);
      const store=audioStore();
      const manifest=await store.get(path+'/manifest',{type:'json',consistency:'strong'});
      if (!manifest) return fail('WAV ainda não foi enviado.',404);
      if (op==='audio-info') return json(manifest);
      const i=Number(url.searchParams.get('i'));
      if (!Number.isInteger(i)||i<0||i>=manifest.chunks) return fail('Bloco inválido.',400);
      const blob=await store.get(path+'/part-'+i,{type:'arrayBuffer',consistency:'strong'});
      if (!blob) return fail('Bloco não encontrado.',404);
      return new Response(blob,{headers:{'Content-Type':'application/octet-stream','Cache-Control':'private, no-store'}});
    }
    if (req.method==='GET' && op==='snapshots') {
      const store=snapStore();
      const list=await store.list({prefix:owner+'/',paginate:false});
      const items=list.blobs.map(e=>({key:e.key,title:e.key.slice(owner.length+1)})).sort((a,b)=>b.key.localeCompare(a.key)).slice(0,100);
      return json(items);
    }
    if (req.method==='POST' && op==='restore') {
      const {key}=await req.json();
      if (typeof key!=='string'||!key.startsWith(owner+'/') || !/^[\w/-]{55,200}$/.test(key)) return fail('Backup inválido.',400);
      const restored=await snapStore().get(key,{type:'json',consistency:'strong'});
      if (!restored || !uuid(restored.id) || !validateContent(restored.content,owner)) return fail('Snapshot indisponível.',404);
      const currentKey=owner+'/'+restored.id;
      const store=songStore();
      const existing=await store.getWithMetadata(currentKey,{type:'json',consistency:'strong'});
      // Antes da restauração, preserva a versão atual para poder desfazer a operação.
      if(existing) await snapStore().setJSON(owner+'/'+restored.id+'/'+new Date().toISOString().replace(/[:.]/g,'-'),existing.data);
      const updated={...restored,row_version:(existing?.data?.row_version||0)+1,updated_at:new Date().toISOString()};
      const saved=await store.setJSON(currentKey,updated,existing?{onlyIfMatch:existing.etag}:{onlyIfNew:true});
      if(!saved.modified) return fail('O registro mudou. Tente restaurar novamente.',409);
      return json({id:restored.id,row_version:updated.row_version});
    }
    return fail('Operação não encontrada.',404);
  } catch(e) {
    console.error('loops-api:',e);
    if(e?.status===403) return fail('Origem não autorizada.',403);
    return fail('Erro no servidor Netlify. Consulte o log da Function.',500);
  }
}
