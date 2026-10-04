import type {
  CharacterDef,
  ChartNote,
  GameResult,
  Grade,
  HudSnapshot,
  I18nText,
  Judgment,
  Lang,
  NoteType,
  Pose,
  SnsPost,
  StageDef,
} from "../types";
import { compileChart, stageDuration } from "../data/stages";
import { ROASTS } from "../data/questions";
import { snsFor } from "../data/sns";
import { t } from "../data/i18n";
import type { AudioEngine } from "../audio/AudioEngine";

const PERFECT = 0.05;
const GREAT = 0.1;
const GOOD = 0.16;
const BAD = 0.26;

const RANK: NoteType[] = ["15", "45", "90", "dogeza"];

function rank(t: NoteType) {
  return RANK.indexOf(t);
}

function comboName(c: number, lang: Lang) {
  if (c >= 50) return t(lang, "comboNational");
  if (c >= 30) return t(lang, "comboLegendary");
  if (c >= 20) return t(lang, "comboExtreme");
  if (c >= 10) return t(lang, "comboSincere");
  if (c >= 5) return t(lang, "comboPolite");
  return "";
}

function timingOf(delta: number, windowMul: number): Judgment {
  const d = Math.abs(delta);
  if (d <= PERFECT * windowMul) return "PERFECT";
  if (d <= GREAT * windowMul) return "GREAT";
  if (d <= GOOD * windowMul) return "GOOD";
  if (d <= BAD * windowMul) return "BAD";
  return "MISS";
}

export class RhythmEngine {
  stage: StageDef;
  character: CharacterDef;
  audio: AudioEngine;
  lang: Lang;
  notes: ChartNote[];
  private judged = new Set<number>();
  private holding: { note: ChartNote; startJudgment: Judgment } | null = null;
  private startAt = 0;
  private raf = 0;
  private combo = 0;
  private maxCombo = 0;
  private score = 0;
  private anger = 0;
  private stock = 0;
  private stockStart = 0;
  private lastStock = 0;
  private gauge = 0;
  private counts: Record<string, number> = {};
  private sns: SnsPost[] = [];
  private snsId = 0;
  private judgment: Judgment | null = null;
  private judgmentId = 0;
  private question: I18nText | null = null;
  private journalist: HudSnapshot["journalist"] = null;
  private pose: Pose = "idle";
  private poseUntil = 0;
  private emotion: HudSnapshot["emotion"] = "idle";
  private flash = 0;
  private shake = false;
  private missFreeze = false;
  private missTimer: number | null = null;
  private roast: I18nText | null = null;
  private beat = 0;
  private finished = false;
  private lastHud = 0;
  private perfects = 0;
  private dogezaPerfects = 0;
  private totalNotes = 0;
  onHud: ((s: HudSnapshot) => void) | null = null;
  onFinish: ((r: GameResult) => void) | null = null;
  running = false;
  paused = false;
  private pauseAccum = 0;
  private pauseStarted = 0;

  constructor(stage: StageDef, character: CharacterDef, audio: AudioEngine, lang: Lang) {
    this.stage = stage;
    this.character = character;
    this.audio = audio;
    this.lang = lang;
    this.notes = compileChart(stage);
    this.totalNotes = this.notes.length;
    this.anger = stage.startAnger;
    this.stock = stage.startStock;
    this.stockStart = stage.startStock;
    this.lastStock = stage.startStock;
    if (character.id === "politician") this.anger = Math.max(0, this.anger - 12);
  }

  time() {
    if (!this.audio.ctx) return 0;
    if (this.paused) return this.pauseStarted - this.startAt - this.pauseAccum;
    return this.audio.ctx.currentTime - this.startAt - this.pauseAccum;
  }

  start() {
    if (!this.audio.ctx) return;
    this.running = true;
    this.startAt = this.audio.ctx.currentTime;
    this.audio.start(this.stage.bpm, this.stage.style);
    this.audio.onBeat = (b) => {
      this.beat = b;
      if (!this.paused && !this.missFreeze && b % 2 === 0) {
        this.flash++;
        this.audio.camera();
      }
    };
    const loop = () => {
      if (!this.running) return;
      this.tick();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  pause() {
    if (this.paused) return;
    this.paused = true;
    this.pauseStarted = this.audio.now();
    this.audio.stop();
  }

  resume() {
    if (!this.paused) return;
    this.pauseAccum += this.audio.now() - this.pauseStarted;
    this.paused = false;
    this.audio.start(this.stage.bpm, this.stage.style);
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    if (this.missTimer !== null) {
      window.clearTimeout(this.missTimer);
      this.missTimer = null;
    }
    this.audio.stop();
    this.audio.onBeat = null;
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* ignore */
    }
  }

  input(type: NoteType, down: boolean) {
    if (!this.running || this.paused || this.finished) return;
    const now = this.time();
    if (down) this.onDown(type, now);
    else this.onUp(type, now);
  }

  private onDown(type: NoteType, now: number) {
    const windowMul = this.character.windowMul;
    const window = BAD * windowMul + 0.02;
    let best: ChartNote | null = null;
    let bestDist = 99;
    for (const n of this.notes) {
      if (this.judged.has(n.id)) continue;
      const dist = Math.abs(n.time - now);
      if (dist < bestDist && dist <= window + 0.08) {
        best = n;
        bestDist = dist;
      }
    }

    this.pose = type === "dogeza" ? "dogeza" : (type as Pose);
    this.poseUntil = now + Math.max(0.18, best?.duration || 0);
    this.audio.whoosh();
    if (type === "dogeza") this.audio.thud();
    if (this.character.id === "ai" && (type === "90" || type === "dogeza")) this.audio.clank();

    if (!best) return;

    if (rank(type) < rank(best.type)) {
      this.apply("INSUFFICIENT", best, now, type);
      return;
    }
    // 과잉 사죄 게이트: 필요 등급 초과 시 OVERAPOLOGY 후보 (도게자 예외는 아래 분기).
    if (rank(type) > rank(best.type)) {
      if (type === "dogeza" && best.type !== "dogeza") {
        if (this.gauge < 80) {
          this.apply("OVERAPOLOGY", best, now, type);
          return;
        }
      } else if (rank(type) > rank(best.type) + 1) {
        this.apply("OVERAPOLOGY", best, now, type);
        return;
      }
    }

    if (best.type === "dogeza" && this.gauge < 55) {
      this.apply("OVERAPOLOGY", best, now, type);
      return;
    }

    const timing = timingOf(now - best.time, windowMul);
    if (timing === "MISS") return;

    if (best.duration > 0.15) {
      this.holding = { note: best, startJudgment: timing };
      this.poseUntil = now + best.duration + 0.4;
    } else {
      this.apply(timing, best, now, type);
    }
  }

  private onUp(_type: NoteType, now: number) {
    if (!this.holding) {
      if (this.pose !== "idle" && now < this.poseUntil - 0.05) {
        /* tap release */
      }
      return;
    }
    const { note, startJudgment } = this.holding;
    this.holding = null;
    const end = note.time + note.duration;
    const early = now < end - GOOD * this.character.windowMul * 1.4;
    const late = now > end + BAD * this.character.windowMul;
    if (early) {
      this.apply("EARLY_RISE", note, now, note.type, startJudgment);
    } else if (late) {
      this.apply("TOO_LONG", note, now, note.type, startJudgment);
    } else {
      this.apply(startJudgment, note, now, note.type);
    }
  }

  private apply(
    j: Judgment,
    note: ChartNote,
    now: number,
    pressed: NoteType,
    holdStart?: Judgment,
  ) {
    this.judged.add(note.id);
    this.judgment = j;
    this.judgmentId++;
    this.counts[j] = (this.counts[j] || 0) + 1;

    const good = j === "PERFECT" || j === "GREAT" || j === "GOOD";
    if (good) {
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      if (j === "PERFECT") {
        this.perfects++;
        this.audio.perfect();
        if (note.type === "dogeza") this.dogezaPerfects++;
      }
    } else {
      this.combo = 0;
      this.audio.miss();
      this.audio.duck(0.38);
      this.missFreeze = true;
      this.shake = true;
      if (this.missTimer !== null) window.clearTimeout(this.missTimer);
      this.missTimer = window.setTimeout(() => {
        this.missFreeze = false;
        this.shake = false;
        this.missTimer = null;
      }, 380);
    }

    const base: Record<string, number> = {
      PERFECT: 1000,
      GREAT: 720,
      GOOD: 420,
      BAD: 120,
      MISS: 0,
      INSUFFICIENT: 40,
      OVERAPOLOGY: 280,
      EARLY_RISE: 80,
      TOO_LONG: 90,
    };
    const comboMul = 1 + Math.min(this.combo, 50) * 0.02;
    this.score += Math.round((base[j] || 0) * comboMul * this.character.scoreMul);

    const angerDelta: Record<string, number> = {
      PERFECT: -2.2,
      GREAT: -1.1,
      GOOD: 0.2,
      BAD: 5,
      MISS: 9,
      INSUFFICIENT: 13,
      OVERAPOLOGY: 3,
      EARLY_RISE: 7,
      TOO_LONG: 6,
    };
    this.anger = Math.max(0, Math.min(100, this.anger + (angerDelta[j] || 0) * this.character.angerMul));

    const stockPct: Record<string, number> = {
      PERFECT: 0.009,
      GREAT: 0.004,
      GOOD: 0,
      BAD: -0.018,
      MISS: -0.045,
      INSUFFICIENT: -0.06,
      OVERAPOLOGY: -0.01,
      EARLY_RISE: -0.025,
      TOO_LONG: -0.02,
    };
    this.lastStock = this.stock;
    this.stock = Math.max(120, this.stock * (1 + (stockPct[j] || 0) * this.character.stockMul));

    const gaugeDelta: Record<string, number> = {
      PERFECT: 9,
      GREAT: 6,
      GOOD: 3,
      BAD: -6,
      MISS: -12,
      INSUFFICIENT: -14,
      OVERAPOLOGY: -8,
      EARLY_RISE: -7,
      TOO_LONG: -5,
    };
    this.gauge = Math.max(0, Math.min(100, this.gauge + (gaugeDelta[j] || 0)));
    if (pressed === "dogeza" && good) this.gauge = Math.max(0, this.gauge - 40);

    if (note.question) {
      this.question = note.question;
      this.journalist = note.journalist ?? this.journalist ?? null;
      this.audio.speak(note.question[this.lang], this.lang);
    }

    if (j === "INSUFFICIENT") this.roast = ROASTS.insufficient;
    else if (j === "OVERAPOLOGY") this.roast = ROASTS.over;
    else if (j === "EARLY_RISE") this.roast = ROASTS.early_rise;
    else if (j === "TOO_LONG") this.roast = ROASTS.too_long;
    else if (j === "MISS" || j === "BAD") this.roast = ROASTS.miss;
    else this.roast = null;

    const post = snsFor(j, this.combo, this.anger, note.type);
    this.sns = [
      { id: this.snsId++, user: post.user, text: post.text, time: "now" },
      ...this.sns,
    ].slice(0, 8);

    this.emotion = this.anger > 70 ? "panicked" : good ? "sorry" : "panicked";
    this.poseUntil = Math.max(this.poseUntil, now + 0.22);
    this.emitHud(now);
    void holdStart;
  }

  private tick() {
    if (this.paused) {
      this.emitHud(this.time());
      return;
    }
    const now = this.time();
    const dur = stageDuration(this.stage);
    this.audio.setIntensity(0.15 + (now / dur) * 0.85);

    for (const n of this.notes) {
      if (this.judged.has(n.id)) continue;
      if (this.holding?.note.id === n.id) continue;
      if (now > n.time + BAD * this.character.windowMul + 0.04) {
        this.apply("MISS", n, now, n.type);
      }
    }

    if (this.holding) {
      const end = this.holding.note.time + this.holding.note.duration;
      if (now > end + BAD * this.character.windowMul + 0.12) {
        const n = this.holding.note;
        const s = this.holding.startJudgment;
        this.holding = null;
        this.apply("TOO_LONG", n, now, n.type, s);
      }
    }

    if (now > this.poseUntil && !this.holding) {
      this.pose = "idle";
      this.emotion = this.anger > 65 ? "panicked" : "focused";
    }

    if (!this.question) {
      const upcoming = this.notes.find(
        (n) => n.question && n.time - now < 1.35 && n.time - now > -0.2 && !this.judged.has(n.id),
      );
      if (upcoming?.question) {
        this.question = upcoming.question;
        this.journalist = upcoming.journalist ?? this.journalist ?? null;
      }
    }

    if (now - this.lastHud > 1 / 30) this.emitHud(now);

    if (!this.finished && now > dur) {
      this.finished = true;
      this.running = false;
      this.audio.stop();
      this.onFinish?.(this.result());
    }
  }

  noteHidden(id: number) {
    if (this.holding?.note.id === id) return false;
    return this.judged.has(id);
  }

  emitHud(now: number) {
    this.lastHud = now;
    const dur = stageDuration(this.stage);
    this.onHud?.({
      score: Math.round(this.score),
      combo: this.combo,
      comboName: comboName(this.combo, this.lang),
      anger: this.anger,
      stock: this.stock,
      stockDelta: this.stock - this.lastStock,
      gauge: this.gauge,
      judgment: this.judgment,
      judgmentId: this.judgmentId,
      question: this.question,
      journalist: this.journalist,
      pose: this.pose,
      emotion: this.emotion,
      sns: this.sns,
      flash: this.flash,
      shake: this.shake,
      missFreeze: this.missFreeze,
      roast: this.roast,
      progress: Math.min(1, now / dur),
      beat: this.beat,
    });
  }

  result(): GameResult {
    const hit =
      (this.counts.PERFECT || 0) +
      (this.counts.GREAT || 0) +
      (this.counts.GOOD || 0) +
      (this.counts.BAD || 0) * 0.3;
    const accuracy = this.totalNotes ? (hit / this.totalNotes) * 100 : 0;
    const misses = this.counts.MISS || 0;
    const allPerfect = this.perfects === this.totalNotes && this.totalNotes > 0;
    let grade: Grade = "F";
    if (accuracy >= 98 && this.dogezaPerfects > 0 && misses === 0) grade = "DOGEZA MASTER";
    else if (accuracy >= 98) grade = "SSS";
    else if (accuracy >= 95) grade = "SS";
    else if (accuracy >= 90) grade = "S";
    else if (accuracy >= 80) grade = "A";
    else if (accuracy >= 70) grade = "B";
    else if (accuracy >= 60) grade = "C";
    else if (accuracy >= 45) grade = "D";

    let ending: GameResult["ending"] = "normal";
    if (allPerfect) ending = "secret";
    else if (accuracy >= 94 && this.anger < 22) ending = "perfect";
    else if (this.anger >= 85 || this.stock < this.stockStart * 0.45) ending = "disaster";
    else if (this.anger >= 62 || accuracy < 62) ending = "bad";

    return {
      stageId: this.stage.id,
      characterId: this.character.id,
      score: Math.round(this.score),
      maxCombo: this.maxCombo,
      comboName: comboName(this.maxCombo, this.lang),
      judgments: { ...this.counts },
      accuracy,
      anger: this.anger,
      stock: this.stock,
      stockStart: this.stockStart,
      grade,
      ending,
      dogezaPerfects: this.dogezaPerfects,
      totalNotes: this.totalNotes,
    };
  }
}

export function visibleNotes(notes: ChartNote[], now: number, approach: number) {
  return notes.filter((n) => n.time - now < approach && n.time + Math.max(n.duration, 0) > now - 0.45);
}
