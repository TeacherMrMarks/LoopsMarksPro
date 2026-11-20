const demos = [
  ['Procissão Suave', 'Entrada', 78, 4],
  ['Aliança', 'Cerimônia', 86, 4],
  ['Celebração', 'Saída', 96, 4],
];

export const exampleSongs = demos.map(([name, occasion, bpm, beats], i) => ({
  name, occasion, bpm, beats, id: 'demo-' + i, demo: true, revision: 1,
  transitions: { 'a>chorus': 'fillStrong', 'b>finish': 'fillLight' }, customFills: [],
  parts: Object.fromEntries([
    ['intro', 2], ['a', 2], ['b', 2], ['c', 2], ['pre', 2], ['chorus', 2],
    ['low', 2], ['high', 2], ['fillIntro', 1], ['fillA', 1], ['fillB', 1], ['fillChorus', 1],
    ['fillLight', 0.5], ['fillStrong', 1], ['fillSpecial', 0.5], ['finish', 1], ['outro', 1],
  ].map(([key, bars]) => [key, { bars, lengthBeats: bars * beats, name: key + '.wav' }])),
}));

export function demoBuffer(ctx, song, part) {
  const sampleRate = ctx.sampleRate;
  const beats = song.parts[part].bars * song.beats;
  const seconds = 60 / song.bpm;
  const size = Math.round((beats * seconds + (part === 'outro' ? 0.65 : 0)) * sampleRate);
  const result = ctx.createBuffer(1, size, sampleRate);
  const samples = result.getChannelData(0);
  let seed = 314159;
  const noise = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2147483648 - 1;
  };
  function hit(beat, kind, amp) {
    const start = Math.round(beat * seconds * sampleRate);
    const horizon = Math.min(size - start, sampleRate * (kind === 'crash' ? 0.72 : 0.29));
    let previous = 0;
    for (let i = 0; i < horizon; i++) {
      const t = i / sampleRate;
      const n = noise();
      const attack = Math.min(1, t * 1400);
      let x;
      if (kind === 'kick') {
        x = Math.sin(2 * Math.PI * (50 * t + 2.6 * (1 - Math.exp(-t * 28)))) * Math.exp(-t * 19);
      } else if (kind === 'snare') {
        x = (n * 0.7 + 0.3 * Math.sin(2 * Math.PI * 183 * t)) * Math.exp(-t * 25);
      } else if (kind === 'tom') {
        x = Math.sin(2 * Math.PI * (105 * t + 1.2 * (1 - Math.exp(-t * 22)))) * Math.exp(-t * 17);
      } else {
        x = (n - previous) * Math.exp(-t * (kind === 'hat' ? 46 : 8)) * 0.62;
      }
      samples[start + i] += x * amp * attack;
      previous = n;
    }
  }
  if (part === 'outro' || part === 'finish') {
    hit(0, 'kick', 0.57); hit(1, 'tom', 0.35);
    hit(1.5, 'snare', 0.32); hit(2, 'tom', 0.4);
    hit(3, 'crash', 0.31); hit(3, 'kick', 0.68);
  } else if (part.startsWith('fill')) {
    for (let i = 0; i < beats * 2; i++) hit(i / 2, i >= 4 ? 'tom' : 'snare', 0.19 + i * 0.019);
    hit(0, 'kick', 0.62);
  } else {
    for (let i = 0; i < beats; i++) {
      const strong = i % 4 === 0;
      const chorus = part === 'chorus' || part === 'high';
      hit(i, 'hat', strong ? 0.23 : 0.15);
      hit(i + 0.5, 'hat', chorus ? 0.18 : 0.095);
      if (strong || i % 4 === 2 || ((part === 'b' || part === 'c') && i % 4 === 3)) hit(i, 'kick', strong ? 0.69 : 0.51);
      if (i % 2 && part !== 'intro' && part !== 'low') hit(i, 'snare', chorus ? 0.49 : 0.29);
      if (chorus && i % 4 === 2) hit(i + 0.5, 'kick', 0.43);
    }
  }
  return result;
}
