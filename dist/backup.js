import { zipSync, unzipSync, strToU8, strFromU8 } from './netlify-client.js';
import { MAX_FILE_BYTES } from './data.js';
const LIMIT = 420 * 1024 * 1024;
function slim(song) {
  return { name: song.name || '', occasion: song.occasion || '', bpm: song.bpm,
    beats: song.beats, parts: structuredClone(song.parts||{}),
    transitions: structuredClone(song.transitions||{}), customFills: structuredClone(song.customFills||[]),
    fillMode: song.fillMode || 'smart', repeatMode: song.repeatMode || 'fill' };
}
export async function makeBackup(repo, mode = 'completo', progress = () => {}) {
  const songs = (await repo.catalog()).filter(song => !song.deleted);
  const data = {type:'LOOPS_MARKS_PRO_BACKUP', schema:3, mode, createdAt:new Date().toISOString(),
    songs:songs.map(slim)};
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
  if(manifest.type!=='LOOPS_MARKS_PRO_BACKUP'||manifest.schema!==3 || !Array.isArray(manifest.songs) || manifest.songs.length>500)
    throw new Error('Versão ou estrutura do backup incompatível.');
  let imported=0;
  for(const [i,song] of manifest.songs.entries()) {
    if(typeof song.name!=='string'||song.name.length>90 || !Number.isFinite(song.bpm) ||
       song.bpm<30||song.bpm>280||!Number.isInteger(song.beats) || song.beats<2||song.beats>6 ||
       !song.parts || typeof song.parts!=='object') throw new Error('Dados inválidos no backup.');
    const id=crypto.randomUUID();
    const restored={id,name:song.name,occasion:String(song.occasion||'').slice(0,55),bpm:song.bpm,
      beats:song.beats,parts:{},transitions:song.transitions||{},customFills:song.customFills||[],
      fillMode: song.fillMode || 'smart', repeatMode: song.repeatMode || 'fill',revision:0};
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
  return {imported,audioIncluded:manifest.mode!=='configuracoes'};
}
export function triggerDownload(blob, filename) {
  const link=document.createElement('a');
  const url=URL.createObjectURL(blob); link.href=url; link.download=filename;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
