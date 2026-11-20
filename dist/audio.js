import { PARTS, DEFAULT_FILLS, FILL_IDS } from './data.js';
import { demoBuffer } from './demo.js';

const LOOPS = new Set(['a', 'b', 'c', 'pre', 'chorus', 'low', 'high']);
const ENDINGS = new Set(['outro', 'finish']);
const LEAD = 0.075;
const FADE = 0.004;
const EPS = 0.0002;
export const MAX_BPM_STEP = 10;

export function nextBoundary(epoch, bar, now) {
  return epoch + Math.max(1, Math.ceil((now + LEAD - epoch) / bar)) * bar;
}
export function bpmRange(original) {
  return [Math.max(30, original - MAX_BPM_STEP), Math.min(280, original + MAX_BPM_STEP)];
}
export function partBeats(part, beats) {
  return Number(part.lengthBeats || (part.bars || 1) * beats);
}

export class Player {
  buffers = new Map();
  preparation = 0;
  segments = [];
  running = false;
  pending = null;
  ready = false;
  constructor(onState) { this.onState = onState; }

  context() {
    if (!this.ctx || this.ctx.state === 'closed') {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) throw new Error('Este navegador não oferece reprodução de áudio para palco.');
      this.ctx = new Context({ latencyHint: 'interactive' });
      this.mix = this.ctx.createGain();
      this.mix.connect(this.ctx.destination);
      this.ctx.addEventListener('statechange', () => this.onState?.());
    }
    return this.ctx;
  }
  cancelPreparation() {
    this.preparation++;
    this.ready = false;
    this.stretcher?.cancel();
  }
  isFill(key) { return FILL_IDS.has(key) || Boolean(this.song?.customFills?.some(item => item.id === key)); }
  async prepare(song, bpm, load) {
    this.cancelPreparation();
    const version = this.preparation;
    const context = this.context();
    const buffers = new Map();
    this.song = song;
    const beatSeconds = 60 / song.bpm;
    const ratio = song.bpm / bpm;
    for (const [key, part] of Object.entries(song.parts || {})) {
      if (!PARTS.some(item => item.id === key) && !this.isFill(key)) continue;
      const audio = song.demo ? demoBuffer(context, song, key) : await load(part.path);
      if (!audio) throw new Error('Falta o áudio de ' + this.label(key) + '. Baixe a música neste aparelho.');
      const decoded = song.demo ? audio : await context.decodeAudioData(await audio.arrayBuffer())
        .catch(() => { throw new Error('Não foi possível ler o WAV de ' + this.label(key) + '.'); });
      if (this.preparation !== version) return false;
      const beats = partBeats(part, song.beats);
      if (!ENDINGS.has(key)) {
        if (!Number.isInteger(beats) || beats < 1) {
          throw new Error(this.label(key) + ': configure a duração em tempos inteiros.');
        }
        if (!this.isFill(key) && beats % song.beats !== 0) {
          throw new Error(this.label(key) + ' precisa ter compassos completos.');
        }
        const expected = beats * beatSeconds;
        if (Math.abs(decoded.duration - expected) > 0.085) {
          throw new Error(this.label(key) + ' mede ' + decoded.duration.toFixed(2) +
            ' s. Para ' + beats + ' tempos deve medir ' + expected.toFixed(2) + ' s. Confira o BPM e o corte na DAW.');
        }
      }
      const target = ENDINGS.has(key) ? decoded.duration * ratio : beats * (60 / bpm);
      const frames = Math.max(1, Math.round(target * context.sampleRate));
      const adjusted = Math.abs(ratio - 1) < 0.00001
        ? decoded : await this.stretch(decoded, frames, decoded.length);
      if (this.preparation !== version) return false;
      const buffer = adjusted.length >= frames ? adjusted : this.copyWithPadding(adjusted, frames);
      buffers.set(key, { buffer, seconds: ENDINGS.has(key) ? buffer.duration : target, beats });
    }
    if (!buffers.has('a')) throw new Error('Cadastre o WAV da Parte A para tocar.');
    this.song = song;
    this.bpm = bpm;
    this.bar = song.beats * 60 / bpm;
    this.buffers = buffers;
    this.ready = true;
    return true;
  }
  copyWithPadding(source, frames) {
    const buffer = this.ctx.createBuffer(source.numberOfChannels, frames, source.sampleRate);
    for (let i = 0; i < source.numberOfChannels; i++) buffer.copyToChannel(source.getChannelData(i), i);
    return buffer;
  }
  stretch(input, target, originalFrames) {
    const worker = new Worker(new URL('./stretch.js', import.meta.url));
    return new Promise((resolve, reject) => {
      const finish = () => { worker.terminate(); this.stretcher = null; };
      this.stretcher = { cancel() { finish(); resolve(input); } };
      worker.onerror = () => { finish(); reject(new Error('O aparelho não conseguiu preparar este BPM.')); };
      worker.onmessage = ({ data }) => {
        finish();
        if (!data.channels) { reject(new Error('O ajuste de BPM falhou.')); return; }
        const output = this.ctx.createBuffer(data.channels.length, target, input.sampleRate);
        data.channels.forEach((samples, i) => output.copyToChannel(new Float32Array(samples), i));
        resolve(output);
      };
      const channels = Array.from({ length: input.numberOfChannels }, (_, i) =>
        input.getChannelData(i).slice(0, originalFrames).buffer);
      worker.postMessage({ channels, target, sampleRate: input.sampleRate, originalFrames }, channels);
    });
  }
  segment(key, at) {
    const meta = this.buffers.get(key);
    if (!meta) throw new Error('Áudio não encontrado: ' + this.label(key));
    const source = this.ctx.createBufferSource();
    const gate = this.ctx.createGain();
    source.buffer = meta.buffer;
    source.loop = LOOPS.has(key);
    if (source.loop) source.loopEnd = meta.seconds;
    source.connect(gate).connect(this.mix);
    if (source.loop) source.start(at, 0);
    else source.start(at, 0, meta.seconds);
    const segment = { key, at, source, gate, end: source.loop ? Infinity : at + meta.seconds,
      naturalEnd: source.loop ? Infinity : at + meta.seconds };
    source.onended = () => { try { source.disconnect(); gate.disconnect(); } catch {} };
    this.segments.push(segment);
    return segment;
  }
  silence(segment, at) {
    if (!segment || segment.end <= at) return;
    const gain = segment.gate.gain;
    gain.cancelScheduledValues(this.ctx.currentTime);
    gain.setValueAtTime(1, Math.max(this.ctx.currentTime, at - FADE));
    gain.linearRampToValueAtTime(0, at);
    segment.end = at;
  }
  restore(segment) {
    segment.end = segment.naturalEnd;
    const now = this.ctx.currentTime;
    segment.gate.gain.cancelScheduledValues(now);
    segment.gate.gain.setValueAtTime(1, now);
  }
  discard(segment) {
    try { segment.source.stop(); } catch {}
    try { segment.source.disconnect(); segment.gate.disconnect(); } catch {}
  }
  clearPlan() {
    const now = this.ctx.currentTime;
    const still = [];
    for (const seg of this.segments) {
      if (seg.at > now + EPS) this.discard(seg);
      else { if (seg.end < seg.naturalEnd) this.restore(seg); still.push(seg); }
    }
    this.segments = still;
    this.pending = null;
  }
  async start() {
    if (!this.ready || this.running) return;
    const ctx = this.context();
    await ctx.resume();
    if (!this.ready || this.running) return;
    this.epoch = ctx.currentTime + LEAD;
    this.running = true;
    this.pending = null;
    this.segments = [];
    if (this.buffers.has('intro')) {
      const intro = this.segment('intro', this.epoch);
      this.introduction(intro);
    } else this.segment('a', this.epoch);
  }
  introduction(intro) {
    const fill = this.buffers.has('fillIntro') ? 'fillIntro' : null;
    // A vinheta é posicionada dentro do último compasso da introdução, terminando no tempo 1.
    if (fill) {
      const start = intro.end - this.buffers.get(fill).seconds;
      if (start > intro.at + EPS) { this.silence(intro, start); this.segment(fill, start); }
      else { this.segment(fill, intro.end); this.segment('a', intro.end + this.buffers.get(fill).seconds); return; }
    }
    this.segment('a', intro.naturalEnd);
  }
  current(now = this.ctx.currentTime) {
    return this.segments.findLast(s => s.at <= now && s.end > now) || null;
  }
  fromKey() {
    const active = this.current();
    if (active && LOOPS.has(active.key)) return active.key;
    if (active?.key === 'intro') return 'intro';
    // Durante uma virada, usa o destino já escolhido como origem da próxima troca.
    return this.pending?.dest || this.segments.findLast(s => LOOPS.has(s.key))?.key || 'a';
  }
  autoFill(from, dest) {
    const setting = this.song.transitions?.[from + '>' + dest];
    if (setting === 'none') return null;
    if (setting && this.buffers.has(setting) && this.isFill(setting)) return setting;
    const candidate = DEFAULT_FILLS[dest];
    return candidate && this.buffers.has(candidate) ? candidate : null;
  }
  request(dest, manual = null) {
    if (!this.running || !this.buffers.has(dest) || !(LOOPS.has(dest) || ENDINGS.has(dest))) return false;
    const now = this.ctx.currentTime;
    const active = this.current(now);
    if (ENDINGS.has(active?.key)) return false;
    if (this.pending && ENDINGS.has(this.pending.dest) && !ENDINGS.has(dest)) return false;
    if (this.pending && now >= this.pending.changeAt - LEAD && !ENDINGS.has(dest)) return false;
    const from = this.pending && now < this.pending.changeAt - LEAD ? this.pending.from : this.fromKey();
    const chosenManual = manual || (this.pending?.manual && this.pending.changeAt > now + LEAD
      ? this.pending.fill : null);
    const fill = chosenManual || this.autoFill(from, dest);
    if (fill && !this.buffers.has(fill)) return false;
    if (active?.key === dest && !fill && !this.pending && !ENDINGS.has(dest)) return false;
    this.clearPlan();
    const fillSeconds = fill ? this.buffers.get(fill).seconds : 0;
    const entry = nextBoundary(this.epoch, this.bar, now + fillSeconds);
    const changeAt = entry - fillSeconds;
    const fromSegment = this.current(now);
    if (fromSegment) {
      this.silence(fromSegment, changeAt);
      // Se uma introdução/virada termina antes da próxima troca, mantém a Parte A até lá.
      if (Number.isFinite(fromSegment.naturalEnd) && fromSegment.naturalEnd < changeAt - EPS &&
          !ENDINGS.has(fromSegment.key) && this.buffers.has('a')) {
        const bridge = this.segment('a', fromSegment.naturalEnd);
        this.silence(bridge, changeAt);
      }
    }
    if (fill) this.segment(fill, changeAt);
    this.segment(dest, entry);
    this.pending = { from, dest, fill, manual: Boolean(chosenManual), changeAt, entry };
    return true;
  }
  go(dest) { return this.request(dest); }
  fill(key) {
    if (!this.running || !this.isFill(key) || !this.buffers.has(key)) return false;
    const dest = this.pending?.dest && this.pending.changeAt > this.ctx.currentTime + LEAD
      ? this.pending.dest : (LOOPS.has(this.fromKey()) ? this.fromKey() : 'a');
    return this.request(dest, key);
  }
  cancel() {
    if (!this.pending || this.ctx.currentTime >= this.pending.changeAt - LEAD) return false;
    this.clearPlan();
    return true;
  }
  stop() {
    this.running = false;
    this.pending = null;
    for (const segment of this.segments) this.discard(segment);
    this.segments = [];
  }
  volume(value) {
    this.context();
    this.mix.gain.setTargetAtTime(value, this.ctx.currentTime, 0.015);
  }
  label(key) { return PARTS.find(part => part.id === key)?.label || this.song?.customFills?.find(part => part.id === key)?.label || key; }
  summary() {
    if (!this.running) return { running: false, beat: -1 };
    const now = this.ctx.currentTime;
    this.segments = this.segments.filter(seg => {
      if (seg.end > now - 0.08) return true;
      this.discard(seg);
      return false;
    });
    if (this.pending && now >= this.pending.entry + EPS) this.pending = null;
    const active = this.current(now);
    if (!active && !this.segments.some(seg => seg.at > now)) {
      this.stop();
      return { running: false, beat: -1 };
    }
    const beats = Math.max(0, (now - this.epoch) * this.bpm / 60);
    return { running: true, beat: Math.floor(beats) % this.song.beats,
      active: active?.key, next: this.pending?.dest,
      fill: this.pending?.fill, canCancel: Boolean(this.pending && this.pending.changeAt > now + LEAD),
      nextIn: this.pending ? Math.max(0, this.pending.entry - now) : 0,
      progress: (beats / this.song.beats) % 1,
      interrupted: !['running', 'closed'].includes(this.ctx.state) };
  }
}
