// V25: per-song mixer profiles; V24 cymbal volumes remain source trims, with one common fader.
export const MIX_CHANNELS = [['master','Master'],['loops','Loops'],['fills','Viradas'],['cymbals','Pratos'],['counter','Contratempos'],['passage','Passagens'],['count','Contagem'],['endings','Finais']];
export const MIX_IDS = MIX_CHANNELS.map(([id])=>id);
const clamp = (v,fallback=1)=>Number.isFinite(v)?Math.max(0,Math.min(1,v)):fallback;
export function normalizeMix(raw, song={}) {
  const defaults={master:.82};
  return Object.fromEntries(MIX_IDS.map(id=>[id,{level:clamp(raw?.[id]?.level,defaults[id]??1),muted:raw?.[id]?.muted===true,solo:id!=='master'&&raw?.[id]?.solo===true}]));
}
export const hasSolo = profile=>MIX_IDS.some(id=>id!=='master'&&profile[id]?.solo===true);
export const soloExcluded = (profile,id)=>id!=='master'&&hasSolo(profile)&&!profile[id]?.solo;
export const effectiveGain = (profile,id)=>profile[id].muted||soloExcluded(profile,id)?0:profile[id].level;
export function mixChannel(key, isFill=false){
  if(key==='countIntro')return 'count';
  if(key==='rideLoop')return 'cymbals';
  if(/^autoCrash[123]$/.test(key))return 'cymbals';
  if(/^crashStop[23]?$/.test(key))return 'cymbals';
  if(key==='outro'||key==='finish')return 'endings';
  if(key.startsWith('counter_'))return 'counter';
  if(key.startsWith('passage_'))return 'passage';
  return isFill||key.startsWith('fill')?'fills':'loops';
}
export const MIX_KEY = 'loops-v25-mix-';
export function readLocalMix(storage,song){try{const raw=JSON.parse(storage.getItem(MIX_KEY+(song.repertoireKey||song.id))||'null');return raw?normalizeMix(raw,song):null;}catch{return null;}}
export function writeLocalMix(storage,song,profile){storage.setItem(MIX_KEY+(song.repertoireKey||song.id),JSON.stringify(normalizeMix(profile,song)));}
