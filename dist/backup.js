import { normalizeMix, readLocalMix, writeLocalMix } from './mixer.js';
import {cleanPreference,PEDAL_KEY} from './preferences.js';
import { MIDI_KEY, loadMidiSettings, saveMidiSettings } from './midi.js';
import { zipSync, unzipSync, strToU8, strFromU8 } from './netlify-client.js';
import { MAX_FILE_BYTES, cleanBreaks, cymbalSettings, audioEntries, cleanPartLabels } from './data.js';
import { cleanLibrary, cleanRepertoireItem, entryId, entryKey } from './library-model.js';
import { validMeter, meterOf } from './meter.js';
const LIMIT = 420 * 1024 * 1024;
function slim(song) {
  return { originalId:song.id, kind:song.kind||'music', folderId:song.folderId||'', name: song.name || '', occasion: song.occasion || '', bpm: song.bpm,
    beats: song.beats, meter: meterOf(song), beatUnit:song.beatUnit, parts: structuredClone(song.parts||{}),
    transitions: structuredClone(song.transitions||{}), customBreaks:structuredClone(cleanBreaks(song)), cymbals:cymbalSettings(song), ...(song.mixer?{mixer:normalizeMix(song.mixer,song)}:{}), customFills: structuredClone(song.customFills||[]),
    fillMode: song.fillMode || 'smart', repeatMode: song.repeatMode || 'fill', introMode:song.introMode==='repeat'?'repeat':'once', countIntroEnabled:song.countIntroEnabled!==false, customSections:structuredClone(song.customSections||[]), partLabels:cleanPartLabels(song.partLabels), sequence:structuredClone(song.sequence||[]), sequenceMode:song.sequenceMode||'assisted' };
}
export async function makeBackup(repo, mode = 'completo', progress = () => {}) {
  const songs = (await repo.catalog()).filter(song => !song.deleted);
  const lib=cleanLibrary(await repo.libraryState());
  const data = {type:'LOOPS_MARKS_PRO_BACKUP', schema:4, mode, createdAt:new Date().toISOString(),
    library:lib,songs:songs.map(slim),preferences:(()=>{
      try{return {pedalMap:JSON.parse(localStorage.getItem('loops-v12-pedal-map')||'{}'),
        midiSettings:loadMidiSettings(localStorage),
        liveCounts:Object.fromEntries(songs.flatMap(song=>{try{const value=JSON.parse(localStorage.getItem('loops-v20-count-'+song.id)||'null');return value&&typeof value.enabled==='boolean'?[[song.id,{enabled:value.enabled,bars:value.bars===2?2:1}]]:[];}catch{return [];}})),
        repertoireMixes:Object.fromEntries(lib.repertoires.flatMap(r=>r.items.flatMap((i,n)=>{const key=entryKey(r.id,entryId(i,n));const mix=readLocalMix(localStorage,{repertoireKey:key});return mix?[[key,mix]]:[];}))),
        repertoireCounts:Object.fromEntries(lib.repertoires.flatMap(r=>r.items.flatMap((i,n)=>{const key=entryKey(r.id,entryId(i,n));try{const count=JSON.parse(localStorage.getItem('loops-v20-count-'+key)||'null');return count&&typeof count.enabled==='boolean'?[[key,{enabled:count.enabled,bars:count.bars===2?2:1}]]:[];}catch{return [];}}))),
        liveMixes:Object.fromEntries(songs.flatMap(song=>{const mix=readLocalMix(localStorage,song);return mix?[[song.id,mix]]:[];})),
        introOpen:localStorage.getItem('loops-v12-editor-intro'),
        managementOpen:localStorage.getItem('loops-v12-management')};}
      catch{return {};}})()};
  let bytes = 0;
  const items = {'manifest.json':strToU8(JSON.stringify(data,null,2))};
  if(mode !== 'configuracoes') {
    const all = songs.flatMap((song, i) => audioEntries(song).map(([part,audio]) => ({song,i,part,audio})));
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
export async function restoreBackup(repo, file, progress = () => {}, onPreference=()=>{}) {
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
  const idMap=new Map(), entryMap=new Map();
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
      beats:song.beats,meter:meterOf(song),beatUnit:song.beatUnit,parts:{},transitions:song.transitions||{},customFills:song.customFills||[],customBreaks:cleanBreaks(song),cymbals:cymbalSettings(song), ...(song.mixer?{mixer:normalizeMix(song.mixer,song)}:{}),
      fillMode: song.fillMode || 'smart', repeatMode: song.repeatMode || 'fill',introMode:song.introMode==='repeat'?'repeat':'once',countIntroEnabled:song.countIntroEnabled!==false,customSections:song.customSections||[],partLabels:cleanPartLabels(song.partLabels),sequence:song.sequence||[],sequenceMode:song.sequenceMode||'assisted',revision:0};
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
      const repId=crypto.randomUUID();
      const items=(r.items||[]).flatMap((item,n)=>{const songId=idMap.get(item.songId);if(!songId)return [];const itemId=crypto.randomUUID();entryMap.set(entryKey(r.id,entryId(item,n)),entryKey(repId,itemId));return [{...cleanRepertoireItem(item,n),songId,itemId}];});
      library.repertoires.push({id:repId,name:r.name.slice(0,90),date:String(r.date||'').slice(0,35),items});
    }
    await repo.saveLibrary(library);
  }
  if(manifest.preferences && typeof localStorage!=='undefined'){
    const p=manifest.preferences;try{
      if(p.pedalMap && typeof p.pedalMap==='object'&&!Array.isArray(p.pedalMap) && Object.keys(p.pedalMap).length<=512)
        {localStorage.setItem('loops-v12-pedal-map',JSON.stringify(p.pedalMap));onPreference(PEDAL_KEY,p.pedalMap);}
      if(p.midiSettings && typeof p.midiSettings==='object'){saveMidiSettings(localStorage,p.midiSettings);onPreference(MIDI_KEY,p.midiSettings);}
      for(const [oldId,newId] of idMap){const count=p.liveCounts?.[oldId];if(count&&typeof count.enabled==='boolean'){const v={enabled:count.enabled,bars:count.bars===2?2:1};localStorage.setItem('loops-v20-count-'+newId,JSON.stringify(v));onPreference('loops-v20-count-'+newId,v);}}
      for(const [oldId,newId] of idMap){const mix=p.liveMixes?.[oldId];if(mix&&typeof mix==='object')writeLocalMix(localStorage,{id:newId},mix);}
      for(const [oldKey,newKey] of entryMap){const mix=p.repertoireMixes?.[oldKey];if(mix&&typeof mix==='object')writeLocalMix(localStorage,{repertoireKey:newKey},mix);const count=p.repertoireCounts?.[oldKey];if(count&&typeof count.enabled==='boolean'){const v={enabled:count.enabled,bars:count.bars===2?2:1};localStorage.setItem('loops-v20-count-'+newKey,JSON.stringify(v));onPreference('loops-v20-count-'+newKey,v);}}
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

// Read only manifest.json (skip audio extraction). No catalog writes, no new IDs.
export async function readControlBackup(file){
  if(!file||file.size>LIMIT)throw new Error('Backup superior ao limite de 420 MB.');
  const entries=unzipSync(new Uint8Array(await file.arrayBuffer()),{filter:entry=>entry.name==='manifest.json'&&entry.originalSize<=8*1024*1024});
  if(!entries['manifest.json'])throw new Error('Manifesto de backup ausente ou muito grande.');
  const m=JSON.parse(strFromU8(entries['manifest.json']));
  if(m.type!=='LOOPS_MARKS_PRO_BACKUP'||![3,4].includes(m.schema))throw new Error('Backup incompatível.');
  const result={};if(m.preferences?.pedalMap&&typeof m.preferences.pedalMap==='object')result[PEDAL_KEY]=cleanPreference(PEDAL_KEY,m.preferences.pedalMap);
  if(m.preferences?.midiSettings&&typeof m.preferences.midiSettings==='object')result[MIDI_KEY]=cleanPreference(MIDI_KEY,m.preferences.midiSettings);
  if(!Object.keys(result).length)throw new Error('O backup não contém mapeamentos MIDI ou pedal.');return result;
}
