// Output preferences are hardware-specific and intentionally local, not synced across devices.
export const OUTPUT_KEY='loops-v33-audio-output';
export function savedOutput(storage){try{return storage.getItem(OUTPUT_KEY)||'';}catch{return '';}}
export function rememberOutput(storage,id){try{storage.setItem(OUTPUT_KEY,id||'');}catch{}}
export async function resumeAudio(ctx){if(ctx.state!=='running')await ctx.resume();if(ctx.state!=='running')throw new Error('O navegador não liberou o áudio ('+ctx.state+'). Toque em Reconectar áudio.');return ctx;}
export async function routeOutput(ctx,id=''){
  if(typeof ctx.setSinkId!=='function'){if(id)throw new Error('Este navegador não permite escolher a saída pelo aplicativo. Use a saída do sistema.');return;}
  if(!id&&ctx.sinkId==='')return;
  await ctx.setSinkId(id);
}
export async function audioOutputs(media){
  if(!media?.enumerateDevices)return [];
  return (await media.enumerateDevices()).filter(d=>d.kind==='audiooutput'&&d.deviceId&&d.deviceId!=='default');
}
export function mixerWarnings(profile,effectiveGain,ids){
  if(!profile)return [];
  const result=[];
  if(effectiveGain(profile,'master')===0)result.push('Master zerado ou em MUTE');
  if(effectiveGain(profile,'loops')===0)result.push('Loops zerado, em MUTE ou excluído por SOLO');
  if(ids.filter(id=>id!=='master').every(id=>effectiveGain(profile,id)===0))result.push('Todos os canais estão silenciados');
  return result;
}
// Independent low-volume diagnostic tone; no song, mix, scheduling or stored settings changed.
export async function testOutput(ctx){
  await resumeAudio(ctx);
  const osc=ctx.createOscillator(),gain=ctx.createGain(),now=ctx.currentTime;
  osc.frequency.value=440;gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.08,now+.025);gain.gain.linearRampToValueAtTime(0,now+.35);
  osc.connect(gain);gain.connect(ctx.destination);osc.onended=()=>{osc.disconnect();gain.disconnect();};osc.start(now);osc.stop(now+.36);
}
