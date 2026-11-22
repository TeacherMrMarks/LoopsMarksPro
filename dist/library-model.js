import { normalizeMix, MIX_IDS } from './mixer.js';
// V11 — pastas e repertórios são metadados: não duplicam arquivos WAV.
export const KINDS = Object.freeze([{id:'music',label:'Músicas'},{id:'rhythm',label:'Ritmos'}]);
export const songKind = song => song?.kind === 'rhythm' ? 'rhythm' : 'music';
export const emptyLibrary = () => ({folders:[],repertoires:[],revision:0,dirty:false});
const partId = /^(intro|a|b|c|d|e|pre|chorus|low|high|section_[a-f0-9]{12})$/;
const itemIdPattern = /^(?:[a-f\d]{8}-[a-f\d-]{27,38}|legacy-[0-9]+)$/i;
export const cleanEntryLabels = raw => Object.fromEntries(Object.entries(raw||{}).filter(([id,name])=>partId.test(id)&&typeof name==='string'&&name.trim()).map(([id,name])=>[id,name.trim().slice(0,52)]));
export const entryId = (item,index) => itemIdPattern.test(item?.itemId||'')?item.itemId:'legacy-'+index;
export const entryKey = (repId,itemId) => 'rep:'+repId+':'+itemId;
export function cleanRepertoireItem(item,index=0){
  return {songId:item.songId,bpm:item.bpm||null,itemId:entryId(item,index),...(item.title?{title:String(item.title).slice(0,90)}:{}),...(item.partLabels?{partLabels:cleanEntryLabels(item.partLabels)}:{}),...(item.mixer?{mixer:normalizeMix(item.mixer)}:{})};
}
// Playback projection only: never save this object as a catalog song.
export function repertoireSong(entry,repId){
  const song=structuredClone(entry.song), labels=cleanEntryLabels(entry.item.partLabels);
  song.name=entry.title||song.name;
  song.partLabels={...song.partLabels,...Object.fromEntries(Object.entries(labels).filter(([id])=>!id.startsWith('section_')))};
  song.customSections=(song.customSections||[]).map(p=>({...p,label:labels[p.id]||p.label}));
  if(entry.item.mixer)song.mixer=normalizeMix(entry.item.mixer);
  song.repertoireKey=entryKey(repId,entry.itemId);
  song.repertoireId=repId;song.repertoireItemId=entry.itemId;song.repertoireBpm=entry.bpm;
  return song;
}
export const cleanLibrary = source => ({
  folders: (source?.folders || []).map(f=>({id:f.id,name:f.name,kind:f.kind})),
  repertoires: (source?.repertoires || []).map(r=>({id:r.id,name:r.name,date:r.date||'',items:(r.items||[]).map(cleanRepertoireItem)})),
});
export const inFolder = (song,kind,folderId='') => songKind(song)===kind && (!folderId || song.folderId===folderId);
export function repertoireEntries(repertoire,songs) {
  const byId = new Map(songs.filter(s=>!s.deleted).map(song=>[song.id,song]));
  return (repertoire?.items||[]).map((item,index)=>({song:byId.get(item.songId),bpm:item.bpm||null,title:item.title||'',item, itemId:entryId(item,index),index}))
    .filter(entry=>entry.song);
}
export function validLibrary(data) {
  if(!data || !Array.isArray(data.folders)||!Array.isArray(data.repertoires)||
      data.folders.length>150||data.repertoires.length>100) return false;
  const uuid=/^[a-f\d]{8}-[a-f\d-]{27,38}$/i;
  const ids=new Set();
  for(const f of data.folders){
    if(!uuid.test(f.id)||!['music','rhythm'].includes(f.kind)||typeof f.name!=='string'||
       !f.name.trim()||f.name.length>70||ids.has(f.id))return false;
    ids.add(f.id);
  }
  ids.clear();
  for(const r of data.repertoires){
    if(!uuid.test(r.id)||typeof r.name!=='string'||!r.name.trim()||r.name.length>90||
       typeof (r.date||'')!=='string'||(r.date||'').length>35||
       !Array.isArray(r.items)||r.items.length>250||ids.has(r.id))return false;
    ids.add(r.id);
    const itemIds=new Set();
    for(const [index,item] of r.items.entries()) {
      if(!item||itemIds.has(entryId(item,index))||(item.itemId!==undefined&&!itemIdPattern.test(item.itemId)))return false;
      itemIds.add(entryId(item,index));
      if(item.partLabels!==undefined&&(!item.partLabels||typeof item.partLabels!=='object'||Array.isArray(item.partLabels)||Object.entries(item.partLabels).some(([id,name])=>!partId.test(id)||typeof name!=='string'||!name.trim()||name.length>52)))return false;
      if(item.mixer!==undefined&&(!item.mixer||typeof item.mixer!=='object'||Array.isArray(item.mixer)||Object.keys(item.mixer).length!==MIX_IDS.length||!MIX_IDS.every(id=>{const m=item.mixer[id];return m&&Number.isFinite(m.level)&&m.level>=0&&m.level<=1&&typeof m.muted==='boolean'&&typeof m.solo==='boolean';})))return false;
      if(!uuid.test(item.songId)||
      (item.bpm!=null && (!Number.isInteger(item.bpm)||item.bpm<30||item.bpm>280)) ||
      (item.title!=null && (typeof item.title!=='string'||item.title.length>90)))return false;
    }
  }
  return true;
}
