import { PARTS, DEFAULT_FILLS, FILL_IDS, ENTRY_OF, BASE_OF_ENTRY, fillBase, fillVariantId, firstPlayablePart, playableParts, extraSections, CRASH_STOPS } from './data.js';
import { demoBuffer } from './demo.js';
import { meterOf } from './meter.js';

const LOOPS = new Set(Object.keys(ENTRY_OF));
const ENDINGS = new Set(['outro', 'finish', ...CRASH_STOPS.map(part => part.id)]);
const LEAD = 0.075;           // antecedência para agendamento no relógio Web Audio
const FADE = 0.004;
const EPS = 0.0002;
export const MAX_BPM_STEP = 10;
export function nextBoundary(epoch, bar, now) {
  return epoch + Math.max(1, Math.ceil((now + LEAD - epoch) / bar)) * bar;
}
export function nextBeat(epoch, beat, now) {
  return epoch + Math.max(0, Math.ceil((now + LEAD - epoch - EPS) / beat)) * beat;
}
export function bpmRange(original) {
  return [Math.max(30, original - MAX_BPM_STEP), Math.min(280, original + MAX_BPM_STEP)];
}
export function partBeats(part, beats) {
  return Number(part.lengthBeats || (part.bars || 1) * beats);
}

/* O mapa de viradas é calculado antes da reprodução. Nunca é feita análise de WAV durante o show.
 * Prioridade: gravação da duração exata > gravação curta compatível > cauda da gravação longa.
 * Os segmentos são sempre agendados por AudioContext.currentTime, nunca com setTimeout. */
export function pickFill(family, availableBeats, buffers, isFill = () => true) {
  if (!family || availableBeats < 1) return null;
  const candidates = [...buffers.entries()]
    .filter(([key, meta]) => (key === family || fillBase(key) === family) && isFill(key) &&
      Number.isInteger(meta.beats) && meta.beats > 0)
    .map(([key, meta]) => ({ key, beats: meta.beats }));
  const exact = candidates.filter(item => item.beats === availableBeats)
    .sort((a,b) => Number(a.key === family) - Number(b.key === family));
  if (exact.length) return { key: exact[0].key, beats: availableBeats, offsetBeats: 0 };
  const short = candidates.filter(item => item.beats < availableBeats)
    .sort((a,b) => b.beats - a.beats || Number(a.key === family) - Number(b.key === family));
  if (short.length) return { key: short[0].key, beats: short[0].beats, offsetBeats: 0 };
  const long = candidates.filter(item => item.beats > availableBeats)
    .sort((a,b) => a.beats - b.beats);
  return long.length ? { key: long[0].key, beats: availableBeats,
    offsetBeats: long[0].beats - availableBeats } : null;
}

export class Player {
  loopKeys=new Set(LOOPS);
  buffers = new Map();
  preparation = 0;
  segments = [];
  running = false;
  pending = null;
  ready = false;
  mode = 'smart';
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
  isFill(key) {
    const family = fillBase(key);
    return FILL_IDS.has(family) || Boolean(this.song?.customFills?.some(item => item.id === family));
  }
  fillExists(family) {
    if (!family) return false;
    return [...this.buffers.keys()].some(key => this.isFill(key) && fillBase(key) === family);
  }
  entryFor(key) { const target=this.song?.customSections?.some(s=>s.id===key) ? key+'Entry' : ENTRY_OF[key]; return target&&this.buffers.has(target) ? target : null; }
  baseFor(key) { const base=key?.endsWith('Entry')?key.slice(0,-5):''; return this.song?.customSections?.some(s=>s.id===base)?base:(BASE_OF_ENTRY[key]||key); }
  setMode(mode) { this.mode = mode === 'full' ? 'full' : 'smart'; }

  async prepare(song, bpm, load) {
    this.cancelPreparation();
    const version = this.preparation;
    const context = this.context();
    const buffers = new Map();
    this.song = song;
    const beatSeconds = 60 / song.bpm;
    const ratio = song.bpm / bpm;
    const supported = new Set([...PARTS.map(part => part.id),...extraSections(song).flatMap(s=>[s.id,s.id+'Entry'])]);
    this.loopKeys=new Set([...LOOPS,...extraSections(song).map(s=>s.id)]);
    if(song.introMode==='repeat')this.loopKeys.add('intro');
    for (const [key, part] of Object.entries(song.parts || {})) {
      if (!supported.has(key) && !this.isFill(key)) continue;
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
          throw new Error(this.label(key) + ' precisa ter compassos completos de ' + meterOf(song) + '.');
        }
        const variant = key.match(/__(\d+)$/);
        if (variant && beats !== Number(variant[1])) {
          throw new Error('A duração de ' + this.label(key) + ' deve ser ' + variant[1] + ' tempos.');
        }
        const expected = beats * beatSeconds;
        if (Math.abs(decoded.duration - expected) > 0.085) {
          throw new Error(this.label(key) + ' mede ' + decoded.duration.toFixed(2) +
            ' s. Para ' + beats + ' pulsos em ' + meterOf(song) + ' deve medir ' + expected.toFixed(2) + ' s. Confira o BPM, o compasso e o corte na DAW.');
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
    this.initialPart = (song.sequence||[]).map(s=>s.part).find(k=>this.loopKeys.has(k)&&buffers.has(k)) || firstPlayablePart(song);
    if (!this.initialPart || !buffers.has(this.initialPart)) throw new Error('Cadastre ao menos um WAV contínuo para tocar.');
    this.song = song;
    this.bpm = bpm;
    this.beatSeconds = 60 / bpm;
    this.bar = song.beats * this.beatSeconds;
    this.buffers = buffers;
    this.setMode(song.fillMode || 'smart');
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
  segment(key, at, { offsetBeats = 0, lengthBeats = null } = {}) {
    const meta = this.buffers.get(key);
    if (!meta) throw new Error('Áudio não encontrado: ' + this.label(key));
    const source = this.ctx.createBufferSource();
    const gate = this.ctx.createGain();
    source.buffer = meta.buffer;
    source.loop = this.loopKeys.has(key);
    if (source.loop) source.loopEnd = meta.seconds;
    source.connect(gate).connect(this.mix);
    const offset = offsetBeats * this.beatSeconds;
    const seconds = lengthBeats === null ? meta.seconds - offset : lengthBeats * this.beatSeconds;
    if (seconds <= 0 || seconds > meta.seconds - offset + .005) {
      throw new Error('Trecho fora da duração do WAV: ' + this.label(key));
    }
    if (source.loop) source.start(at, 0);
    else source.start(at, offset, seconds);
    const end = source.loop ? Infinity : at + seconds;
    const segment = { key, at, source, gate, end, naturalEnd: end, offsetBeats, lengthBeats };
    source.onended = () => { try { source.disconnect(); gate.disconnect(); } catch {} };
    this.segments.push(segment);
    return segment;
  }
  scheduleDestination(dest, at) {
    if (ENDINGS.has(dest)) return this.segment(dest, at);
    const attack = this.entryFor(dest);
    if (attack) {
      const entry = this.segment(attack, at);
      this.segment(dest, entry.naturalEnd);
      return entry;
    }
    return this.segment(dest, at);
  }
  silence(segment, at) {
    if (!segment || segment.end <= at) return;
    const gain = segment.gate.gain;
    gain.cancelScheduledValues(this.ctx.currentTime);
    const safe = Math.max(this.ctx.currentTime, at - FADE);
    gain.setValueAtTime(1, safe);
    gain.linearRampToValueAtTime(0, Math.max(at, safe + 0.0001));
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
    this.initSequence();
    // Contagem prévia independente; antigas introduções continuam em 'intro'.
    const count = this.song.countIntroEnabled!==false && this.buffers.has('countIntro')
      ? this.segment('countIntro', this.epoch) : null;
    const musicalAt=count ? count.naturalEnd : this.epoch;
    if (this.buffers.has('intro')) {
      const intro = this.segment('intro', musicalAt);
      this.introduction(intro);
    } else this.scheduleDestination(this.initialPart || 'a', musicalAt);
    this.sequenceEnteredAt=this.segments.find(seg=>this.baseFor(seg.key)===this.initialPart)?.at??this.sequenceEnteredAt;
  }
  introduction(intro) {
    // Na repetição, a saída acontece somente quando o músico acionar outra parte.
    if(this.song.introMode==='repeat')return;
    const fill = this.buffers.has('fillIntro') ? 'fillIntro' : null;
    if (fill) {
      const start = intro.end - this.buffers.get(fill).seconds;
      if (start > intro.at + EPS) { this.silence(intro, start); this.segment(fill, start); }
      else {
        this.segment(fill, intro.end);
        this.scheduleDestination(this.initialPart || 'a', intro.end + this.buffers.get(fill).seconds);
        return;
      }
    }
    this.scheduleDestination(this.initialPart || 'a', intro.naturalEnd);
  }
  current(now = this.ctx.currentTime) {
    return this.segments.findLast(s => s.at <= now && s.end > now) || null;
  }
  fromKey() {
    const active = this.current();
    const key = this.baseFor(active?.key);
    if (this.loopKeys.has(key)) return key;
    if (active?.key === 'intro') return 'intro';
    if (active?.key === 'countIntro') return 'intro';
    return this.pending?.dest || this.baseFor(this.segments.findLast(s => this.loopKeys.has(this.baseFor(s.key)))?.key) || this.initialPart || 'a';
  }
  autoFill(from, dest) {
    const setting = this.song.transitions?.[from + '>' + dest];
    if (setting === 'none') return null;
    if (setting && this.fillExists(setting)) return setting;
    const candidate = DEFAULT_FILLS[dest];
    return this.fillExists(candidate) ? candidate : null;
  }
  planFill(family, now) {
    // Modo completo: preserva a virada gravada; inicia no ponto seguro futuro.
    if (this.mode === 'full') {
      const available = [...this.buffers.entries()].filter(([key, data]) =>
        fillBase(key) === family && this.isFill(key) && Number.isInteger(data.beats));
      const preferred = available.find(([key]) => key === family) ||
        available.sort((a,b) => b[1].beats - a[1].beats)[0];
      if (!preferred) return null;
      const [key, meta] = preferred;
      const entry = nextBoundary(this.epoch, this.bar, now + meta.beats * this.beatSeconds);
      return { fill: key, changeAt: entry - meta.beats * this.beatSeconds, entry,
        fillBeats: meta.beats, offsetBeats: 0 };
    }
    // Modo adaptativo: tenta cair no PRÓXIMO tempo 1 do compasso.
    const entry = nextBoundary(this.epoch, this.bar, now);
    const first = nextBeat(this.epoch, this.beatSeconds, now);
    const available = Math.max(0, Math.round((entry - first) / this.beatSeconds));
    const selected = pickFill(family, available, this.buffers, key => this.isFill(key));
    if (!selected) return { fill: null, changeAt: entry, entry, fillBeats: 0, offsetBeats: 0 };
    return { fill: selected.key, changeAt: entry - selected.beats * this.beatSeconds,
      entry, fillBeats: selected.beats, offsetBeats: selected.offsetBeats };
  }
  request(dest, manual = null, forcedEntry=null) {
    if (!this.running || !this.buffers.has(dest) || !(this.loopKeys.has(dest) || ENDINGS.has(dest))) return false;
    const now = this.ctx.currentTime;
    const active = this.current(now);
    if (ENDINGS.has(active?.key)) return false;
    if (this.pending && ENDINGS.has(this.pending.dest) && !ENDINGS.has(dest)) return false;
    if (this.pending && now >= this.pending.changeAt - LEAD && !ENDINGS.has(dest)) return false;
    const from = this.pending && now < this.pending.changeAt - LEAD ? this.pending.from : this.fromKey();
    // Ataque final de bumbo + prato: nenhuma virada, nem mesmo uma já enfileirada.
    // O ataque começa no próximo tempo 1 e sua cauda WAV termina naturalmente.
    const isolatedCrash = CRASH_STOPS.some(part => part.id === dest);
    const chosenManual = isolatedCrash ? null : (manual || (this.pending?.manual && this.pending.changeAt > now + LEAD
      ? this.pending.family : null));
    let family = isolatedCrash ? null : (chosenManual || this.autoFill(from, dest));
    if (this.loopKeys.has(dest) && dest === from && !chosenManual && this.song.repeatMode === 'direct') family = null;
    if (family && !this.fillExists(family)) return false;
    this.clearPlan();
    let plan = family ? this.planFill(family, now) : null;
    if(forcedEntry && forcedEntry>now+LEAD*2){
      const beatsAvailable=Math.max(0,Math.min(this.song.beats,Math.floor((forcedEntry-nextBeat(this.epoch,this.beatSeconds,now))/this.beatSeconds+.0001)));
      const selection=family?pickFill(family,beatsAvailable,this.buffers,k=>this.isFill(k)):null;
      plan={fill:selection?.key||null,entry:forcedEntry,changeAt:selection?forcedEntry-selection.beats*this.beatSeconds:forcedEntry,fillBeats:selection?.beats||0,offsetBeats:selection?.offsetBeats||0};
    }
    const fill = plan?.fill || null;
    const entry = plan?.entry || nextBoundary(this.epoch, this.bar, now);
    const changeAt = plan?.changeAt ?? entry;
    const fromSegment = this.current(now);
    if (fromSegment) {
      this.silence(fromSegment, changeAt);
      // Mantém a continuidade da Parte A quando o arquivo de introdução terminar antes da troca.
      if (Number.isFinite(fromSegment.naturalEnd) && fromSegment.naturalEnd < changeAt - EPS &&
          !ENDINGS.has(fromSegment.key) && this.buffers.has(this.initialPart || 'a')) {
        const bridge = this.segment(this.initialPart || 'a', fromSegment.naturalEnd);
        this.silence(bridge, changeAt);
      }
    }
    if (fill) this.segment(fill, changeAt, {
      offsetBeats: plan.offsetBeats, lengthBeats: plan.fillBeats,
    });
    this.scheduleDestination(dest, entry);
    this.pending = { from, dest, fill, family, manual: Boolean(chosenManual), changeAt, entry,
      fillBeats: plan?.fillBeats || 0, offsetBeats: plan?.offsetBeats || 0 };
    return true;
  }
  go(dest) {
    if(this.sequenceAuto)this.sequenceAuto=false;
    const changed=this.request(dest);
    if(changed && this.sequenceSteps?.length){
      const index=this.sequenceSteps.findIndex(s=>s.part===dest);
      if(index>=0)this.sequenceScheduled={index,entry:this.pending?.entry??this.ctx.currentTime};
    }
    return changed;
  }
  fill(key) {
    if(this.sequenceAuto)this.sequenceAuto=false;
    if (!this.running || !this.isFill(key) || !this.fillExists(fillBase(key))) return false;
    const dest = this.pending?.dest && this.pending.changeAt > this.ctx.currentTime + LEAD
      ? this.pending.dest : (this.loopKeys.has(this.fromKey()) ? this.fromKey() : (this.initialPart || 'a'));
    return this.request(dest, fillBase(key));
  }
  cancel() {
    if (!this.pending || this.ctx.currentTime >= this.pending.changeAt - LEAD) return false;
    this.clearPlan();
    return true;
  }
  stop() {
    this.running = false;
    this.pending = null;
    this.sequenceSteps=[];this.sequenceScheduled=null;
    for (const segment of this.segments) this.discard(segment);
    this.segments = [];
  }
  initSequence() {
    const source=this.song.kind==='rhythm'?[]:(this.song.sequence||[]);
    const indexed=source.map((step,index)=>({...step,rawIndex:index})).filter(s=>
      (this.loopKeys.has(s.part)||ENDINGS.has(s.part))&&this.buffers.has(s.part));
    const normalized=new Map(indexed.map((step,index)=>[step.rawIndex,index]));
    this.sequenceSteps=indexed.map(({rawIndex,...step})=>({
      ...step,jumpTo:normalized.get(step.jumpTo)??-1,
    }));
    this.sequenceIndex=Math.max(0,this.sequenceSteps.findIndex(s=>this.loopKeys.has(s.part)));
    const countSeconds=this.song.countIntroEnabled!==false?(this.buffers.get('countIntro')?.seconds||0):0;
    this.sequenceEnteredAt=this.epoch+countSeconds+(this.buffers.get('intro')?.seconds||0);
    this.sequenceScheduled=null;
    this.sequenceAuto=this.song.sequenceMode==='automatic' && this.song.introMode!=='repeat';
    this.sequenceCount=0;
  }
  sequenceTarget(fromIndex) {
    const step=this.sequenceSteps[fromIndex];
    if(!step)return -1;
    const jump=Number.isInteger(step.jumpTo)?step.jumpTo:-1;
    // Cycles are intentional; stages marked 'repeat until command' wait for the next foot/touch cue.
    return jump>=0&&jump<this.sequenceSteps.length?jump:fromIndex+1<this.sequenceSteps.length?fromIndex+1:-1;
  }
  nextSequence(direction=1){
    if(!this.running||!this.sequenceSteps?.length)return false;
    const target=direction<0?Math.max(0,this.sequenceIndex-1):this.sequenceTarget(this.sequenceIndex);
    if(target<0||!this.sequenceSteps[target]||!this.buffers.has(this.sequenceSteps[target].part))return false;
    const step=this.sequenceSteps[target];
    if(!this.request(step.part))return false;
    this.sequenceScheduled={index:target,entry:this.pending?.entry??this.ctx.currentTime};
    return true;
  }
  tickSequence(now) {
    if(!this.sequenceSteps?.length||!this.running)return;
    if(this.sequenceScheduled && now>=this.sequenceScheduled.entry-EPS){
      this.sequenceIndex=this.sequenceScheduled.index;
      this.sequenceEnteredAt=this.sequenceScheduled.entry;
      this.sequenceScheduled=null;
      this.sequenceCount++;
    }
    if(!this.sequenceAuto||this.sequenceScheduled||this.pending)return;
    const step=this.sequenceSteps[this.sequenceIndex];
    if(!step||step.repeats===0||ENDINGS.has(step.part)||this.sequenceCount>500)return;
    const part=this.buffers.get(step.part);
    if(!part)return;
    const entry=this.buffers.get(this.entryFor(step.part));
    const totalBeats=(entry?.beats||part.beats)+Math.max(0,step.repeats-1)*part.beats;
    const duration=totalBeats*this.beatSeconds;
    const deadline=this.sequenceEnteredAt+duration;
    const target=this.sequenceTarget(this.sequenceIndex);
    if(target<0)return;
    // Schedule in advance; AudioContext clock owns the actual playback boundaries.
    if(now>=deadline-Math.max(this.bar,0.45) && now<deadline-LEAD*2){
      const dest=this.sequenceSteps[target].part;
      if(this.request(dest,null,deadline))this.sequenceScheduled={index:target,entry:deadline};
    }
  }
  volume(value) {
    this.context();
    this.mix.gain.setTargetAtTime(value, this.ctx.currentTime, 0.015);
  }
  label(key) {
    const base = fillBase(key);
    const name = PARTS.find(part => part.id === base)?.label ||
      this.song?.customSections?.find(part => part.id === base)?.label ||
      this.song?.customFills?.find(part => part.id === base)?.label || key;
    const variant = key.match(/__(\d+)$/);
    return variant ? name + ' (' + variant[1] + 'T)' : name;
  }
  summary() {
    if (!this.running) return { running: false, beat: -1 };
    this.tickSequence(this.ctx.currentTime);
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
      active: this.baseFor(active?.key), entryAttack: Boolean(BASE_OF_ENTRY[active?.key]),
      next: this.pending?.dest, fill: this.pending?.fill,
      fillBeats: this.pending?.fillBeats, offsetBeats: this.pending?.offsetBeats,
      canCancel: Boolean(this.pending && this.pending.changeAt > now + LEAD),
      nextIn: this.pending ? Math.max(0, this.pending.entry - now) : 0,
      progress: (beats / this.song.beats) % 1,
      interrupted: !['running', 'closed'].includes(this.ctx.state),
      sequenceIndex:this.sequenceSteps?.length?this.sequenceIndex:null,
      sequenceNext:this.sequenceSteps?.length?this.sequenceTarget(this.sequenceIndex):null,
      sequenceName:this.sequenceSteps?.[this.sequenceIndex]?.part||null,
      sequenceTotal:this.sequenceSteps?.length||0,sequenceAuto:this.sequenceAuto }; 
  }
}
