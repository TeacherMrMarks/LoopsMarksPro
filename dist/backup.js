import { zipSync, unzipSync, strToU8, strFromU8 } from './netlify-client.js';
import { MAX_FILE_BYTES } from './data.js';
import { cleanLibrary } from './library-model.js';
import { validMeter, meterOf } from './meter.js';
const LIMIT = 420 * 1024 * 1024;
function slim(song) {
  return { originalId:song.id, kind:song.kind||'music', folderId:song.folderId||'', name: song.name || '', occasion: song.occasion || '', bpm: song.bpm,
    beats: song.beats, meter: meterOf(song), beatUnit:song.beatUnit, parts: structuredClone(song.parts||{}),
    transitions: structuredClone(song.transitions||{}), customFills: structuredClone(song.customFills||[]),
    fillMode: song.fillMode || 'smart', repeatMode: song.repeatMode || 'fill', introMode:song.introMode==='repeat'?'repeat':'once', countIntroEnabled:song.countIntroEnabled!==false, customSections:structuredClone(song.customSections||[]), sequence:structuredClone(song.sequence||[]), sequenceMode:song.sequenceMode||'assisted' };
}
export async function makeBackup(repo, mode = 'completo', progress = () => {}) {
  const songs = (await repo.catalog()).filter(song => !song.deleted);
  const lib=cleanLibrary(await repo.libraryState());
  const data = {type:'LOOPS_MARKS_PRO_BACKUP', schema:4, mode, createdAt:new Date().toISOString(),
    library:lib,songs:songs.map(slim),preferences:(()=>{
      try{return {pedalMap:JSON.parse(localStorage.getItem('loops-v12-pedal-map')||'{}'),
        introOpen:localStorage.getItem('loops-v12-editor-intro'),
        managementOpen:localStorage.getItem('loops-v12-management')};}
      catch{return {};}})()};
  let bytes = 0;
  const items = {'manifest.json':strToU8(JSON.stringify(data,null,2))};
  if(mode !== 'configuracoes') {
    const all = songs.flatMap((song, i) => Object.entries(song.parts||{}).map(([part,audio]) => ({song,i,part,audio})));
    for (const [i,entry] of all.entries()) {
      const file = await repo.audio(entry.audio.path) || await repo.cloud.audio(entry.audio.path);
      if (!file || file.size>MAX_FILE_BYTES) throw new Error('WAV ausente ou inválido: '+entry.song.name+' / '+entry.part);
      bytes += file.size;
      if(bytes>LIMIT) throw new Error('O backup ultrapassou 420 MB. Exporte por etapas ou salve os áudios em grupos.');
      items['audios/'+entry.i+'/'+entry.part+'.wav'] = new Uint8Array(await file.arrayBuffer());
      progress(i+1,all.length);
    }
  }
  // Sem compressão adicional: WAVs não precisam de conversão nem alteração de qualidade.
  const zipped=zipSync(items,{level:0});
  return new Blob([zipped],{type:'application/zip'});
}
export async function restoreBackup(repo, file, progress = () => {}) {
  if (!file || file.size > LIMIT) throw new Error('O arquivo ZIP supera o limite de segurança de 420 MB.');
  const input=new Uint8Array(await file.arrayBuffer());
  const entries=unzipSync(input);
  if(!entries['manifest.json']) throw new Error('O ZIP não contém o manifest.json do Loops Marks Pro.');
  let manifest;
  try { manifest=JSON.parse(strFromU8(entries['manifest.json'])); }
  catch { throw new Error('Manifesto de backup inválido.'); }
  if(manifest.type!=='LOOPS_MARKS_PRO_BACKUP'||![3,4].includes(manifest.schema) || !Array.isArray(manifest.songs) || manifest.songs.length>500)
    throw new Error('Versão ou estrutura do backup incompatível.');
  let imported=0;
  const idMap=new Map();
  const library=await repo.libraryState();
  const folderMap=new Map();
  if(manifest.schema===4){
    for(const f of manifest.library?.folders||[]){
      if(!['music','rhythm'].includes(f.kind)||typeof f.name!=='string'||!f.name.trim())continue;
      const dest=library.folders.find(entry=>entry.kind===f.kind&&entry.name===f.name);
      const id=dest?.id||crypto.randomUUID();folderMap.set(f.id,id);
      if(!dest)library.folders.push({id,name:f.name.slice(0,70),kind:f.kind});
    }
  }
  for(const [i,song] of manifest.songs.entries()) {
    if(typeof song.name!=='string'||song.name.length>90 || !Number.isFinite(song.bpm) ||
       song.bpm<30||song.bpm>280||!validMeter(song) ||
       !song.parts || typeof song.parts!=='object') throw new Error('Dados inválidos no backup.');
    const id=crypto.randomUUID();if(song.originalId)idMap.set(song.originalId,id);
    const restored={id,kind:song.kind==='rhythm'?'rhythm':'music',folderId:folderMap.get(song.folderId)||'',name:song.name,occasion:String(song.occasion||'').slice(0,55),bpm:song.bpm,
      beats:song.beats,meter:meterOf(song),beatUnit:song.beatUnit,parts:{},transitions:song.transitions||{},customFills:song.customFills||[],
      fillMode: song.fillMode || 'smart', repeatMode: song.repeatMode || 'fill',introMode:song.introMode==='repeat'?'repeat':'once',countIntroEnabled:song.countIntroEnabled!==false,customSections:song.customSections||[],sequence:song.sequence||[],sequenceMode:song.sequenceMode||'assisted',revision:0};
    const files=[];
    for(const [part,meta] of Object.entries(song.parts)) {
      if(!/^[A-Za-z0-9_-]{1,80}$/.test(part)) continue;
      const raw=entries['audios/'+i+'/'+part+'.wav'];
      if(!raw || raw.byteLength<44 || raw.byteLength>MAX_FILE_BYTES) continue;
      const header=strFromU8(raw.subarray(0,4));
      if(header!=='RIFF' && header!=='RF64') throw new Error('WAV inválido no backup: '+part);
      const path=repo.owner+'/'+id+'/'+crypto.randomUUID()+'.wav';
      restored.parts[part]={...meta,path};
      files.push([path,new Blob([raw],{type:'audio/wav'})]);
    }
    // Backup só de configurações cria um rascunho sem WAV, sem caminhos inacessíveis.
    await repo.save(restored,files);
    imported++;
    progress(imported,manifest.songs.length);
  }
  if(manifest.schema===4){
    for(const r of manifest.library?.repertoires||[]){
      if(typeof r.name!=='string'||!r.name.trim())continue;
      const items=(r.items||[]).map(item=>({songId:idMap.get(item.songId),bpm:item.bpm||null,title:String(item.title||'').slice(0,90)}))
        .filter(item=>item.songId);
      library.repertoires.push({id:crypto.randomUUID(),name:r.name.slice(0,90),date:String(r.date||'').slice(0,35),items});
    }
    await repo.saveLibrary(library);
  }
  if(manifest.preferences && typeof localStorage!=='undefined'){
    const p=manifest.preferences;try{
      if(p.pedalMap && typeof p.pedalMap==='object'&&!Array.isArray(p.pedalMap) && Object.keys(p.pedalMap).length<=32)
        localStorage.setItem('loops-v12-pedal-map',JSON.stringify(p.pedalMap));
      if(['open','closed'].includes(p.introOpen))localStorage.setItem('loops-v12-editor-intro',p.introOpen);
      if(['open','closed'].includes(p.managementOpen))localStorage.setItem('loops-v12-management',p.managementOpen);
    }catch{/* Navegador pode bloquear preferências locais; dados restaurados permanecem intactos. */}}
  return {imported,audioIncluded:manifest.mode!=='configuracoes'};
}
export function triggerDownload(blob, filename) {
  const link=document.createElement('a');
  const url=URL.createObjectURL(blob); link.href=url; link.download=filename;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
