import type { MusicStyle } from "../types";

function midi(n: number) {
  return 440 * Math.pow(2, (n - 69) / 12);
}

export class AudioEngine {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  music: GainNode | null = null;
  sfx: GainNode | null = null;
  muted = false;
  musicMuted = false;
  private noise: AudioBuffer | null = null;
  private timer: number | null = null;
  private nextBeat = 0;
  private beatNum = 0;
  bpm = 120;
  style: MusicStyle = "jazz";
  intensity = 0.2;
  playing = false;
  onBeat: ((beat: number, time: number) => void) | null = null;

  async init() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") await this.ctx.resume();
      return;
    }
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.85;
    this.master.connect(ctx.destination);
    this.music = ctx.createGain();
    this.music.gain.value = 0.55;
    this.music.connect(this.master);
    this.sfx = ctx.createGain();
    this.sfx.gain.value = 0.9;
    this.sfx.connect(this.master);
    const len = ctx.sampleRate * 1;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
  }

  start(bpm: number, style: MusicStyle) {
    if (!this.ctx || !this.music) return;
    this.bpm = bpm;
    this.style = style;
    this.playing = true;
    this.beatNum = 0;
    this.intensity = 0.15;
    this.nextBeat = this.ctx.currentTime + 0.06;
    // G-01: stop()이 내린 gain 복구 (재개 무음 버그)
    if (!this.musicMuted) {
      const t = this.ctx.currentTime;
      this.music.gain.cancelScheduledValues(t);
      this.music.gain.setTargetAtTime(0.55, t, 0.05);
    }
    if (this.timer) clearInterval(this.timer);
    this.timer = window.setInterval(() => this.schedule(), 20);
  }

  stop() {
    this.playing = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.ctx && this.music) {
      const t = this.ctx.currentTime;
      this.music.gain.cancelScheduledValues(t);
      this.music.gain.setTargetAtTime(0.0001, t, 0.08);
    }
  }

  setIntensity(n: number) {
    this.intensity = Math.max(0, Math.min(1, n));
  }

  duck(seconds = 0.45) {
    if (!this.ctx || !this.music) return;
    const t = this.ctx.currentTime;
    this.music.gain.cancelScheduledValues(t);
    this.music.gain.setValueAtTime(this.music.gain.value, t);
    this.music.gain.linearRampToValueAtTime(0.04, t + 0.04);
    this.music.gain.linearRampToValueAtTime(this.musicMuted ? 0 : 0.55, t + seconds);
  }

  toggleMusic() {
    this.musicMuted = !this.musicMuted;
    if (this.music) this.music.gain.value = this.musicMuted ? 0 : 0.55;
  }

  now() {
    return this.ctx?.currentTime ?? 0;
  }

  private schedule() {
    if (!this.ctx || !this.playing) return;
    const horizon = this.ctx.currentTime + 0.12;
    const step = 60 / this.bpm;
    while (this.nextBeat < horizon) {
      this.playBeat(this.beatNum, this.nextBeat);
      this.onBeat?.(this.beatNum, this.nextBeat);
      this.nextBeat += step;
      this.beatNum++;
    }
  }

  private dest() {
    return this.music!;
  }

  private playBeat(n: number, time: number) {
    if (!this.ctx || this.musicMuted) return;
    const beat = n % 4;
    const bar = Math.floor(n / 4);
    const i = this.intensity;
    const st = this.style;

    if (st === "jazz") {
      if (beat === 0 || beat === 2) this.kick(time, 0.7);
      if (beat === 1 || beat === 3) this.snare(time, 0.35);
      this.ride(time, beat === 0 ? 0.18 : 0.1);
      this.walkBass(time, n);
      if (beat === 0) this.piano(time, bar);
    } else if (st === "corporate") {
      if (beat === 0 || beat === 2) this.kick(time, 0.85);
      if (beat === 2) this.snare(time, 0.7);
      this.hat(time, 0.08);
      if (i > 0.4) this.hat(time + (60 / this.bpm) * 0.5, 0.05);
      this.bass(time, n, [36, 36, 43, 39][beat]);
      if (beat === 0) this.piano(time, bar);
    } else if (st === "electro") {
      this.kick(time, 0.95);
      if (beat === 2) this.snare(time, 0.8);
      this.hat(time, 0.07);
      this.hat(time + (60 / this.bpm) * 0.5, 0.05);
      this.bass(time, n, [33, 33, 36, 40][beat], true);
      if (beat === 0 && i > 0.3) this.stab(time, bar);
    } else if (st === "dnb") {
      this.kick(time, beat % 2 === 0 ? 1 : 0.4);
      if (beat === 2) this.snare(time, 0.9);
      const eighth = (60 / this.bpm) * 0.5;
      this.hat(time, 0.06);
      this.hat(time + eighth * 0.5, 0.04);
      this.hat(time + eighth, 0.05);
      this.bass(time, n, [28, 31, 33, 36][beat], true);
      if (beat === 0) this.stab(time, bar);
    } else {
      this.kick(time, 1);
      if (beat === 2) this.snare(time, 1);
      this.hat(time, 0.08);
      this.hat(time + (60 / this.bpm) * 0.5, 0.06);
      this.bass(time, n, [28, 28, 31, 33][beat], true);
      if (beat === 0) this.stab(time, bar, true);
      if (i > 0.7 && beat === 3) this.kick(time + (60 / this.bpm) * 0.5, 0.5);
    }

    if (n % 16 === 0) this.crash(time, 0.18 + i * 0.15);
  }

  private osc(
    type: OscillatorType,
    freq: number,
    time: number,
    dur: number,
    gain: number,
    dest: AudioNode,
    slide?: number,
  ) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, time);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), time + dur);
    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    o.connect(g);
    g.connect(dest);
    o.start(time);
    o.stop(time + dur + 0.02);
  }

  private burst(time: number, dur: number, gain: number, hp = 800, dest?: AudioNode) {
    if (!this.ctx || !this.noise) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = hp;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    src.connect(f);
    f.connect(g);
    g.connect(dest ?? this.dest());
    src.start(time);
    src.stop(time + dur + 0.02);
  }

  private kick(time: number, v = 1) {
    this.osc("sine", 140, time, 0.22, 0.85 * v, this.dest(), 38);
    this.osc("sine", 80, time, 0.12, 0.4 * v, this.dest(), 30);
  }
  private snare(time: number, v = 1) {
    this.burst(time, 0.12, 0.35 * v, 1200);
    this.osc("triangle", 180, time, 0.08, 0.18 * v, this.dest());
  }
  private hat(time: number, v = 0.08) {
    this.burst(time, 0.04, v, 6000);
  }
  private ride(time: number, v: number) {
    this.burst(time, 0.18, v, 5000);
    this.osc("sine", 6400, time, 0.12, v * 0.15, this.dest());
  }
  private crash(time: number, v: number) {
    this.burst(time, 0.5, v, 2000);
  }
  private bass(time: number, _n: number, midiNote: number, growl = false) {
    const f = midi(midiNote);
    this.osc("triangle", f, time, 0.28, 0.22, this.dest());
    if (growl) this.osc("sawtooth", f * 0.5, time, 0.18, 0.08, this.dest());
  }
  private walkBass(time: number, n: number) {
    const scale = [36, 39, 41, 43, 44, 46, 48, 43];
    this.osc("triangle", midi(scale[n % scale.length]), time, 0.32, 0.2, this.dest());
  }
  private piano(time: number, bar: number) {
    const chords = [
      [60, 63, 67, 70],
      [58, 62, 65, 68],
      [56, 60, 63, 67],
      [55, 58, 62, 65],
    ];
    const c = chords[bar % chords.length];
    c.forEach((m, i) => this.osc("sine", midi(m), time + i * 0.01, 0.45, 0.07, this.dest()));
  }
  private stab(time: number, bar: number, hard = false) {
    const chords = [
      [48, 51, 55],
      [46, 50, 53],
      [44, 48, 51],
      [43, 46, 50],
    ];
    const c = chords[bar % chords.length];
    c.forEach((m) =>
      this.osc(hard ? "sawtooth" : "square", midi(m), time, 0.16, hard ? 0.05 : 0.06, this.dest()),
    );
  }

  camera() {
    if (!this.ctx || !this.sfx) return;
    const t = this.ctx.currentTime;
    this.burst(t, 0.03, 0.25, 3000, this.sfx);
    this.burst(t + 0.05, 0.04, 0.18, 2500, this.sfx);
  }
  whoosh() {
    if (!this.ctx || !this.sfx) return;
    this.burst(this.ctx.currentTime, 0.12, 0.2, 400, this.sfx);
  }
  thud() {
    if (!this.ctx || !this.sfx) return;
    const t = this.ctx.currentTime;
    this.osc("sine", 90, t, 0.28, 0.7, this.sfx, 30);
    this.burst(t, 0.16, 0.3, 200, this.sfx);
  }
  miss() {
    if (!this.ctx || !this.sfx) return;
    const t = this.ctx.currentTime;
    this.osc("square", 110, t, 0.18, 0.12, this.sfx);
    this.osc("square", 116, t, 0.18, 0.1, this.sfx);
    this.burst(t, 0.08, 0.12, 800, this.sfx);
  }
  perfect() {
    if (!this.ctx || !this.sfx) return;
    const t = this.ctx.currentTime;
    this.osc("sine", 1320, t, 0.12, 0.12, this.sfx);
    this.osc("sine", 1760, t + 0.05, 0.14, 0.1, this.sfx);
  }
  clank() {
    if (!this.ctx || !this.sfx) return;
    const t = this.ctx.currentTime;
    this.osc("square", 880, t, 0.05, 0.1, this.sfx);
    this.osc("square", 420, t + 0.04, 0.08, 0.08, this.sfx);
    this.burst(t, 0.06, 0.15, 1800, this.sfx);
  }
  speak(text: string, lang: "en" | "ja" | "ko") {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang === "ja" ? "ja-JP" : lang === "ko" ? "ko-KR" : "en-US";
      u.rate = 1.08;
      u.pitch = 0.95;
      u.volume = 0.55;
      window.speechSynthesis.speak(u);
    } catch {
      /* ignore */
    }
  }
}
