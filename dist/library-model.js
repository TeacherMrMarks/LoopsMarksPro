// V11 — pastas e repertórios são metadados: não duplicam arquivos WAV.
export const KINDS = Object.freeze([{id:'music',label:'Músicas'},{id:'rhythm',label:'Ritmos'}]);
export const songKind = song => song?.kind === 'rhythm' ? 'rhythm' : 'music';
export const emptyLibrary = () => ({folders:[],repertoires:[],revision:0,dirty:false});
export const cleanLibrary = source => ({
  folders: (source?.folders || []).map(f=>({id:f.id,name:f.name,kind:f.kind})),
  repertoires: (source?.repertoires || []).map(r=>({id:r.id,name:r.name,date:r.date||'',items:(r.items||[]).map(i=>({songId:i.songId,bpm:i.bpm||null}))})),
});
export const inFolder = (song,kind,folderId='') => songKind(song)===kind && (!folderId || song.folderId===folderId);
export function repertoireEntries(repertoire,songs) {
  const byId = new Map(songs.filter(s=>!s.deleted).map(song=>[song.id,song]));
  return (repertoire?.items||[]).map(item=>({song:byId.get(item.songId),bpm:item.bpm||null}))
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
    for(const item of r.items) if(!uuid.test(item.songId)||
      (item.bpm!=null && (!Number.isInteger(item.bpm)||item.bpm<30||item.bpm>280)))return false;
  }
  return true;
}
