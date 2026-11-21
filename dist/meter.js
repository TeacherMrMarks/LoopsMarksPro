// V16: fórmulas de compasso explícitas, sem migrar ou regravar os WAVs antigos.
// Em compassos compostos, o BPM representa a semínima pontuada: 6/8 tem 2 pulsos,
// 9/8 tem 3, 12/8 tem 4. As batidas internas do motor são esses pulsos.
export const METERS = Object.freeze([
  { value:'2/4', beats:2, note:'2 tempos de semínima' },
  { value:'3/4', beats:3, note:'3 tempos de semínima · valsa / balada' },
  { value:'4/4', beats:4, note:'4 tempos de semínima' },
  { value:'5/4', beats:5, note:'5 tempos de semínima' },
  { value:'6/4', beats:6, note:'6 tempos de semínima' },
  { value:'7/4', beats:7, note:'7 tempos de semínima' },
  { value:'2/2', beats:2, note:'2 tempos de mínima' },
  { value:'3/8', beats:3, note:'3 tempos de colcheia' },
  { value:'5/8', beats:5, note:'5 tempos de colcheia' },
  { value:'6/8', beats:2, note:'2 pulsos de semínima pontuada · blues' },
  { value:'6/8@quarter', label:'6/8 · BPM de semínima (DAW)', beats:3, note:'3 semínimas por compasso · para WAVs exportados com BPM na semínima' },
  { value:'7/8', beats:7, note:'7 colcheias por compasso' },
  { value:'9/8', beats:3, note:'3 pulsos de semínima pontuada' },
  { value:'12/8', beats:4, note:'4 pulsos de semínima pontuada' },
]);
const BY_METER=new Map(METERS.map(entry=>[entry.value,entry]));
export const meterByName=value=>BY_METER.get(value)||null;
export function meterChoice(song) {
  return song?.meter==='6/8' && song?.beatUnit==='quarter' ? '6/8@quarter' : meterOf(song);
}
export const beatUnitForChoice=choice=>choice==='6/8@quarter'?'quarter':undefined;
export function meterOf(song) {
  // Cadastros V15 ou anteriores não têm o campo meter: manter exatamente N/4.
  return BY_METER.has(song?.meter) && !song.meter.includes('@') ? song.meter : `${song?.beats||4}/4`;
}
export function countForMeter(name) { return BY_METER.get(name)?.beats || null; }
export function validMeter(song) {
  return Number.isInteger(song?.beats)&&song.beats>=2&&song.beats<=12&&
    (!song.meter || (BY_METER.has(song.meter) && !song.meter.includes('@') &&
      (!song.beatUnit || (song.beatUnit==='quarter' && song.meter==='6/8')) &&
      countForMeter(meterChoice(song))===song.beats));
}
export function meterHint(song) {
  const meter=BY_METER.get(meterChoice(song));
  return meter ? `${meterOf(song)} · ${meter.note} · BPM nessa unidade` :
    `${meterOf(song)} · ${song?.beats||4} tempos por compasso`;
}
export function wavMeasure(song) {return (song?.beats || 4)*60/(song?.bpm || 84);}
export function classifyDuration(duration,song,isFill=false,tolerance=0.085) {
  const beatSeconds=60/song.bpm;
  const raw=duration/beatSeconds;
  const beats=Math.round(raw);
  if(!Number.isFinite(duration)||duration<=0||beats<1 ||Math.abs(beats*beatSeconds-duration)>tolerance)
    return {ok:false,reason:'tempo',beats,expected:beats*beatSeconds,barSeconds:wavMeasure(song)};
  if(!isFill && beats%song.beats!==0)
    return {ok:false,reason:'bar',beats,expected:beats*beatSeconds,barSeconds:wavMeasure(song)};
  return {ok:true,beats,bars:beats/song.beats,barSeconds:wavMeasure(song)};
}
