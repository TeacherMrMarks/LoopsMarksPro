// V12: acesso de músico somente leitura; o link pode ser revogado pela Central.
import {getStore} from '@netlify/blobs';
import {createHash, timingSafeEqual} from 'node:crypto';
const accessStore=()=>getStore({name:'loops-v12-access',consistency:'strong'});
const songsStore=()=>getStore({name:'loops-v3-songs',consistency:'strong'});
const audioStore=()=>getStore({name:'loops-v3-wavs',consistency:'strong'});
const libraryStore=()=>getStore({name:'loops-v11-library',consistency:'strong'});
const json=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
const error=(message,status)=>json({message},status);
export function tokenParts(token){
  if(typeof token!=='string')return null;
  const matched=/^([a-f0-9-]{36})\.([a-f0-9]{64})$/i.exec(token);
  return matched?{owner:matched[1],token}:null;
}
export function safeEqualToken(received,expected){
  if(!expected||!received)return false;
  const a=Buffer.from(createHash('sha256').update(received).digest('hex'));
  const b=Buffer.from(expected);
  return a.length===b.length&&timingSafeEqual(a,b);
}
async function authorized(request){
  const bearer=request.headers.get('authorization')||'';
  const token=bearer.startsWith('Bearer ')?bearer.slice(7):'';
  const parsed=tokenParts(token);
  if(!parsed)return null;
  const row=await accessStore().get(parsed.owner+'/current',{type:'json',consistency:'strong'});
  if(!row||!safeEqualToken(token,row.sha256)||!row.active||Date.now()>Date.parse(row.expiresAt))return null;
  return {owner:parsed.owner,expiresAt:row.expiresAt};
}
const validAudio=(path,owner)=>typeof path==='string'&&path.startsWith(owner+'/')&&
  /^[0-9a-z-]{8,100}\/[0-9a-f-]{30,40}\/[0-9a-f-]{30,40}\.wav$/i.test(path);
export default async function handler(request){
  try {
    if(request.method!=='GET')return error('Acesso apenas para leitura.',405);
    const url=new URL(request.url);
    if(url.searchParams.get('op')==='manifest'){
      // O manifesto de instalação no iPhone mantém o link pessoal no atalho.
      const token=url.searchParams.get('chave')||'';
      const headers=new Headers(request.headers);headers.set('authorization','Bearer '+token);
      const access=await authorized(new Request(request.url,{headers}));
      if(!access)return error('Link revogado.',401);
      return new Response(JSON.stringify({id:'./?modo=musico&chave='+encodeURIComponent(token),
        name:'Loops Marks Pro',short_name:'Loops Marks Pro',lang:'pt-BR',
        start_url:'/?modo=musico&chave='+encodeURIComponent(token),scope:'/',display:'standalone',
        background_color:'#0c1722',theme_color:'#0c1722',
        icons:[{src:'/icon-192.png',sizes:'192x192',type:'image/png'},{src:'/icon-512.png',sizes:'512x512',type:'image/png'}]}),
        {headers:{'Content-Type':'application/manifest+json','Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
    }
    const access=await authorized(request);
    if(!access)return error('Link revogado, expirado ou inválido. Peça um novo acesso ao administrador.',401);
    const op=url.searchParams.get('op')||'';
    const owner=access.owner;
    if(op==='resolve')return json({owner,expiresAt:access.expiresAt,readonly:true});
    if(op==='catalog'){
      const store=songsStore(),list=await store.list({prefix:owner+'/',paginate:false});
      const rows=await Promise.all(list.blobs.map(entry=>store.get(entry.key,{type:'json',consistency:'strong'})));
      return json(rows.filter(Boolean));
    }
    if(op==='library'){
      const data=await libraryStore().get(owner+'/index',{type:'json',consistency:'strong'});
      return json(data||{revision:0,content:{folders:[],repertoires:[]}});
    }
    if(op==='audio-info'||op==='audio-chunk'){
      const path=url.searchParams.get('path');
      if(!validAudio(path,owner))return error('Arquivo não autorizado.',403);
      const store=audioStore(),meta=await store.get(path+'/manifest',{type:'json',consistency:'strong'});
      if(!meta)return error('WAV indisponível.',404);
      if(op==='audio-info')return json(meta);
      const index=Number(url.searchParams.get('i'));
      if(!Number.isInteger(index)||index<0||index>=meta.chunks)return error('Bloco inválido.',400);
      const binary=await store.get(path+'/part-'+index,{type:'arrayBuffer',consistency:'strong'});
      if(!binary)return error('Bloco indisponível.',404);
      return new Response(binary,{status:200,headers:{'Content-Type':'application/octet-stream','Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
    }
    return error('Operação indisponível.',404);
  } catch(e){console.error('loops-musician:',e);return error('Falha temporária na leitura. Consulte a conexão.',500);}
}
