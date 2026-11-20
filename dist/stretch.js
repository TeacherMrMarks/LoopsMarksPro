/* WSOLA: overlap aligned fragments of the original recording to preserve pitch. */
self.onmessage = ({ data }) => {
  const { channels, target, sampleRate, originalFrames } = data;
  const source = channels.map(samples => new Float32Array(samples));
  const output = source.map(() => new Float32Array(target));
  const hop = Math.round(sampleRate * 0.018);
  const search = Math.round(sampleRate * 0.007);
  const stride = Math.max(2, Math.round(sampleRate / 8000));
  const inputHop = hop * originalFrames / target;
  const sample = (channel, index) => source[channel][index] || 0;
  let previous = 0;

  for (let pos = 0, cursor = 0; pos < target; pos += hop, cursor += inputHop) {
    const ideal = Math.round(cursor);
    let start = ideal;
    if (pos && ideal < originalFrames) {
      const from = Math.max(0, ideal - search);
      const to = Math.min(originalFrames - 1, ideal + search);
      let best = -Infinity;
      for (let candidate = from; candidate <= to; candidate += stride) {
        let dot = 0, a2 = 0, b2 = 0;
        for (let i = 0; i < hop; i += stride) {
          const a = sample(0, previous + hop + i);
          const b = sample(0, candidate + i);
          dot += a * b;
          a2 += a * a;
          b2 += b * b;
        }
        const score = dot / (Math.sqrt(a2 * b2) + 1e-9) -
          0.015 * Math.abs(candidate - ideal) / search;
        if (score > best) { best = score; start = candidate; }
      }
    }
    for (let ch = 0; ch < output.length; ch += 1) {
      for (let i = 0; i < hop && pos + i < target; i += 1) {
        const value = sample(ch, start + i);
        if (pos === 0) {
          output[ch][i] = value;
        } else {
          const blend = i / hop;
          output[ch][pos + i] = sample(ch, previous + hop + i) * (1 - blend) + value * blend;
        }
      }
    }
    previous = start;
  }
  const buffers = output.map(channel => channel.buffer);
  self.postMessage({ channels: buffers }, buffers);
};
