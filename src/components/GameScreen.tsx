import { useEffect, useMemo, useRef, useState } from "react";
import type { CharacterId, HudSnapshot, Lang, NoteType, StageDef } from "../types";
import { CHARACTERS } from "../data/characters";
import { t } from "../data/i18n";
import { JOURNALISTS } from "../data/questions";
import { compileChart } from "../data/stages";
import { RhythmEngine, visibleNotes } from "../game/RhythmEngine";
import type { AudioEngine } from "../audio/AudioEngine";
import type { GameResult } from "../types";
import { BowCharacter } from "./BowCharacter";
import { cn } from "../utils/cn";

const APPROACH = 1.55;
const LANES: NoteType[] = ["15", "45", "90", "dogeza"];
const KEYS: Record<string, NoteType> = {
  a: "15",
  s: "45",
  d: "90",
  " ": "dogeza",
  j: "15",
  k: "45",
  l: "90",
  enter: "dogeza",
  arrowleft: "15",
  arrowdown: "45",
  arrowright: "90",
  arrowup: "dogeza",
};
const LABEL: Record<NoteType, string> = { "15": "15°", "45": "45°", "90": "90°", dogeza: "土下座" };
const KEYL: Record<NoteType, string> = { "15": "A", "45": "S", "90": "D", dogeza: "SPACE" };
const COLOR: Record<NoteType, string> = {
  "15": "#7ec8e3",
  "45": "#e0b44a",
  "90": "#ff6b35",
  dogeza: "#e84a7f",
};

const emptyHud: HudSnapshot = {
  score: 0,
  combo: 0,
  comboName: "",
  anger: 0,
  stock: 0,
  stockDelta: 0,
  gauge: 0,
  judgment: null,
  judgmentId: 0,
  question: null,
  journalist: null,
  pose: "idle",
  emotion: "idle",
  sns: [],
  flash: 0,
  shake: false,
  missFreeze: false,
  roast: null,
  progress: 0,
  beat: 0,
};

export function GameScreen({
  stage,
  characterId,
  lang,
  audio,
  onExit,
  onResult,
}: {
  stage: StageDef;
  characterId: CharacterId;
  lang: Lang;
  audio: AudioEngine;
  onExit: () => void;
  onResult: (r: GameResult) => void;
}) {
  const character = CHARACTERS.find((c) => c.id === characterId) ?? CHARACTERS[0];
  const engineRef = useRef<RhythmEngine | null>(null);
  const laneRef = useRef<HTMLDivElement | null>(null);
  const noteEls = useRef<Map<number, HTMLDivElement>>(new Map());
  const [hud, setHud] = useState<HudSnapshot>({ ...emptyHud, anger: stage.startAnger, stock: stage.startStock });
  const [phase, setPhase] = useState<"ready" | "count" | "play" | "pause">("ready");
  const [count, setCount] = useState(3);
  const [held, setHeld] = useState<Partial<Record<NoteType, boolean>>>({});
  const [musicOn, setMusicOn] = useState(true);
  const notes = useMemo(() => compileChart(stage), [stage]);
  const timeRef = useRef(0);

  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const countTimer = useRef<number | null>(null);
  useEffect(() => () => {
    if (countTimer.current !== null) window.clearInterval(countTimer.current);
  }, []);

  useEffect(() => {
    const eng = new RhythmEngine(stage, character, audio, lang);
    engineRef.current = eng;
    eng.onHud = (s) => setHud(s);
    eng.onFinish = (r) => onResultRef.current(r);
    return () => eng.destroy();
  }, [stage, character, audio, lang]);

  useEffect(() => {
    if (phase !== "play" && phase !== "pause") return;
    let raf = 0;
    const loop = () => {
      const eng = engineRef.current;
      const root = laneRef.current;
      if (eng && root) {
        const now = eng.time();
        timeRef.current = now;
        const h = root.clientHeight;
        const vis = visibleNotes(notes, now, APPROACH);
        const visIds = new Set(vis.map((n) => n.id));
        for (const [id, el] of noteEls.current) {
          if (!visIds.has(id) || eng.noteHidden(id)) el.style.opacity = "0";
        }
        for (const n of vis) {
          const el = noteEls.current.get(n.id);
          if (!el) continue;
          if (eng.noteHidden(n.id)) {
            el.style.opacity = "0";
            continue;
          }
          const p = 1 - (n.time - now) / APPROACH;
          const y = p * (h - 86);
          el.style.transform = `translate(-50%, ${y}px)`;
          el.style.opacity = p < 0 ? "0" : "1";
          if (n.duration > 0) {
            const tail = el.querySelector("[data-tail]") as HTMLDivElement | null;
            if (tail) {
              const pxPerSec = (h - 86) / APPROACH;
              tail.style.height = `${Math.max(8, n.duration * pxPerSec)}px`;
              tail.style.bottom = "100%";
            }
          }
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, notes]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === "Escape") {
        e.preventDefault();
        const eng = engineRef.current;
        if (!eng) return;
        if (phase === "play") {
          eng.pause();
          setPhase("pause");
        } else if (phase === "pause") {
          eng.resume();
          setPhase("play");
        }
        return;
      }
      const type = KEYS[e.key.toLowerCase()];
      if (!type) return;
      e.preventDefault();
      setHeld((h) => ({ ...h, [type]: true }));
      engineRef.current?.input(type, true);
    };
    const up = (e: KeyboardEvent) => {
      const type = KEYS[e.key.toLowerCase()];
      if (!type) return;
      e.preventDefault();
      setHeld((h) => ({ ...h, [type]: false }));
      engineRef.current?.input(type, false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [phase]);

  const begin = async () => {
    await audio.init();
    if (countTimer.current !== null) window.clearInterval(countTimer.current);
    setPhase("count");
    setCount(3);
    let n = 3;
    const id = window.setInterval(() => {
      n -= 1;
      setCount(n);
      if (n <= 0) {
        window.clearInterval(id);
        if (countTimer.current === id) countTimer.current = null;
        setPhase("play");
        engineRef.current?.start();
      }
    }, 700);
    countTimer.current = id;
  };

  const padDown = (type: NoteType) => {
    setHeld((h) => ({ ...h, [type]: true }));
    engineRef.current?.input(type, true);
  };
  const padUp = (type: NoteType) => {
    setHeld((h) => ({ ...h, [type]: false }));
    engineRef.current?.input(type, false);
  };

  const jInfo = hud.journalist ? JOURNALISTS[hud.journalist] : null;
  const angerHeat = hud.anger / 100;

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden film-grain",
        hud.shake && "animate-shake",
      )}
    >
      <img
        src="/images/game-bg.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/45 to-black/90" />
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          background: `radial-gradient(ellipse at center, transparent 30%, rgba(140,0,20,${angerHeat * 0.45}) 100%)`,
        }}
      />

      {hud.missFreeze && (
        <div className="pointer-events-none absolute inset-0 z-40 bg-black/55 backdrop-grayscale" />
      )}
      <div
        key={hud.flash}
        className="pointer-events-none absolute inset-0 z-30 bg-white"
        style={{ animation: hud.flash ? "flash-white 0.18s ease-out both" : "none" }}
      />

      <div className="relative z-10 flex h-full flex-col">
        <header className="flex items-center justify-between px-4 py-3 md:px-8">
          <div>
            <div className="font-[family-name:var(--font-jp)] text-lg tracking-widest text-[var(--gold)]">
              SUMIMASEN!
            </div>
            <div className="text-[10px] uppercase tracking-[0.35em] text-[var(--paper)]/50">
              {stage.title[lang]}
            </div>
          </div>
          <div className="text-center">
            <div className="font-[family-name:var(--font-mono)] text-2xl text-white md:text-3xl">
              {hud.score.toLocaleString()}
            </div>
            {hud.combo >= 5 && (
              <div key={hud.combo} className="animate-slam text-xs tracking-[0.4em] text-[var(--gold)]">
                {hud.combo} {hud.comboName}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              className="lang-pill"
              onClick={() => {
                audio.toggleMusic();
                setMusicOn((v) => !v);
              }}
            >
              {t(lang, "mute")} {musicOn ? "ON" : "OFF"}
            </button>
            <button
              className="lang-pill"
              onClick={() => {
                engineRef.current?.pause();
                setPhase("pause");
              }}
            >
              ESC
            </button>
          </div>
        </header>

        <div className="gold-line mx-4 md:mx-8" />

        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[220px_1fr_220px]">
          <aside className="hidden flex-col gap-4 p-4 md:flex">
            <Meter label={t(lang, "anger")} value={hud.anger} color="#ff3b5c" fire={hud.anger > 60} />
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-[0.3em] text-[var(--paper)]/50">
                {t(lang, "gauge")}
              </div>
              <div className="h-2 overflow-hidden bg-white/10">
                <div
                  className="h-full bg-gradient-to-r from-[#e84a7f] to-[var(--gold)] transition-all"
                  style={{ width: `${hud.gauge}%` }}
                />
              </div>
            </div>
            <div className="press-card max-h-56 overflow-hidden p-3">
              <div className="mb-2 text-[10px] uppercase tracking-[0.3em] text-[var(--gold)]">SNS</div>
              <div className="space-y-2 hide-scroll overflow-y-auto">
                {hud.sns.map((p) => (
                  <div key={p.id} className="text-xs leading-snug">
                    <span className="text-[var(--gold)]">{p.user}</span>{" "}
                    <span className="text-[var(--paper)]/80">{p.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <div className="relative flex min-h-0 flex-col items-center">
            {hud.question && (
              <div className="absolute top-2 z-20 mx-4 max-w-xl px-4 text-center">
                <div className="font-[family-name:var(--font-jp)] text-xl text-white drop-shadow md:text-3xl">
                  「{hud.question[lang]}」
                </div>
              </div>
            )}

            {hud.roast && hud.missFreeze && (
              <div className="absolute top-24 z-50 animate-slam text-center">
                <div className="font-[family-name:var(--font-jp)] text-2xl text-[#ff6b35] md:text-4xl">
                  {hud.roast[lang]}
                </div>
              </div>
            )}

            <div className="mt-16 flex flex-1 items-end justify-center pb-2">
              <BowCharacter character={characterId} pose={hud.pose} emotion={hud.emotion} />
            </div>

            {hud.judgment && (
              <div
                key={hud.judgmentId}
                className={cn(
                  "pointer-events-none absolute bottom-56 left-1/2 z-30 -translate-x-1/2 animate-slam font-[family-name:var(--font-display)] text-3xl tracking-[0.2em] md:text-5xl",
                  hud.judgment === "PERFECT" && "judgment-perfect",
                  hud.judgment === "GREAT" && "judgment-great",
                  hud.judgment === "GOOD" && "judgment-good",
                  hud.judgment === "BAD" && "judgment-bad",
                  (hud.judgment === "MISS" || hud.judgment === "EARLY_RISE" || hud.judgment === "TOO_LONG") &&
                    "judgment-miss",
                  hud.judgment === "INSUFFICIENT" && "judgment-insufficient",
                  hud.judgment === "OVERAPOLOGY" && "judgment-over",
                )}
              >
                {hud.judgment === "INSUFFICIENT"
                  ? "INSUFFICIENT"
                  : hud.judgment === "OVERAPOLOGY"
                    ? "OVERAPOLOGY"
                    : hud.judgment === "EARLY_RISE"
                      ? "TOO SOON"
                      : hud.judgment === "TOO_LONG"
                        ? "TOO LONG"
                        : hud.judgment}
              </div>
            )}
          </div>

          <aside className="hidden flex-col gap-4 p-4 md:flex">
            <div className="press-card p-3">
              <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--paper)]/50">
                {t(lang, "stock")}
              </div>
              <div
                className={cn(
                  "font-[family-name:var(--font-mono)] text-2xl",
                  hud.stock >= stage.startStock ? "text-[var(--stock-up)]" : "text-[var(--stock-down)]",
                )}
              >
                ¥{Math.round(hud.stock).toLocaleString()}
              </div>
              <div
                className={cn(
                  "text-xs",
                  hud.stock >= stage.startStock ? "text-[var(--stock-up)]" : "text-[var(--stock-down)]",
                )}
              >
                {(((hud.stock - stage.startStock) / stage.startStock) * 100).toFixed(1)}%
              </div>
            </div>
            {jInfo && (
              <div className="press-card overflow-hidden">
                <img src={jInfo.portrait} alt="" className="h-36 w-full object-cover object-top" />
                <div className="p-3">
                  <div className="text-sm text-white">{jInfo.name[lang]}</div>
                  <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--gold)]">
                    {jInfo.title[lang]} {"★".repeat(jInfo.stars)}
                  </div>
                </div>
              </div>
            )}
            <div className="h-1.5 overflow-hidden bg-white/10">
              <div className="h-full bg-[var(--gold)]" style={{ width: `${hud.progress * 100}%` }} />
            </div>
          </aside>
        </div>

        <div className="relative z-20 px-2 pb-3 md:px-8">
          <div ref={laneRef} className="relative mx-auto h-52 max-w-xl overflow-hidden">
            <div className="absolute inset-0 grid grid-cols-4 gap-2">
              {LANES.map((lane) => (
                <div key={lane} className="relative h-full overflow-hidden rounded-sm bg-black/35">
                  <div
                    className="absolute inset-x-0 bottom-10 h-14 border-y border-white/30"
                    style={{ boxShadow: held[lane] ? `0 0 24px ${COLOR[lane]}` : undefined }}
                  />
                  <div
                    className="absolute bottom-12 left-1/2 z-10 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-md border-2 text-[10px] font-bold"
                    style={{
                      borderColor: COLOR[lane],
                      color: COLOR[lane],
                      background: held[lane] ? COLOR[lane] : "transparent",
                      boxShadow: held[lane] ? `0 0 20px ${COLOR[lane]}` : undefined,
                    }}
                  >
                    {held[lane] ? "●" : LABEL[lane]}
                  </div>
                  <div className="absolute bottom-1 left-0 right-0 text-center font-[family-name:var(--font-display)] text-[10px] tracking-widest text-white/50">
                    {KEYL[lane]}
                  </div>
                </div>
              ))}
            </div>
            {notes.map((n) => (
              <div
                key={`${stage.id}-${n.id}`}
                ref={(el) => {
                  if (el) noteEls.current.set(n.id, el);
                  else noteEls.current.delete(n.id);
                }}
                className="lane-note"
                style={{
                  color: COLOR[n.type],
                  background: `linear-gradient(180deg, ${COLOR[n.type]}, #111)`,
                  height: n.duration > 0 ? 28 : 36,
                  left: `${(LANES.indexOf(n.type) + 0.5) * 25}%`,
                  top: 0,
                  opacity: 0,
                  border: `2px solid ${COLOR[n.type]}`,
                }}
              >
                {n.duration > 0 && (
                  <div
                    data-tail
                    className="absolute left-1/2 w-5 -translate-x-1/2 rounded-t-sm"
                    style={{ background: COLOR[n.type], opacity: 0.45 }}
                  />
                )}
                <span className="relative z-10 text-[11px] text-black">{LABEL[n.type]}</span>
                {n.hint && (
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] tracking-widest text-white">
                    PRESS {KEYL[n.type]}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="mx-auto mt-2 grid max-w-xl grid-cols-4 gap-2 md:hidden">
            {LANES.map((lane) => (
              <button
                key={lane}
                className="h-14 rounded border text-xs tracking-widest"
                style={{
                  borderColor: COLOR[lane],
                  color: held[lane] ? "#111" : COLOR[lane],
                  background: held[lane] ? COLOR[lane] : "rgba(0,0,0,0.4)",
                }}
                onPointerDown={(e) => {
                  e.preventDefault();
                  padDown(lane);
                }}
                onPointerUp={() => padUp(lane)}
                onPointerLeave={() => padUp(lane)}
              >
                {KEYL[lane]}
                <div>{LABEL[lane]}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {phase === "ready" && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80">
          <div className="mb-2 font-[family-name:var(--font-jp)] text-sm tracking-[0.5em] text-[var(--gold)]">
            {t(lang, "ready")}
          </div>
          <h2 className="mb-2 font-[family-name:var(--font-jp)] text-4xl text-white">{stage.title[lang]}</h2>
          <p className="mb-8 max-w-md px-6 text-center text-sm text-[var(--paper)]/70">{stage.scandal[lang]}</p>
          <div className="mb-8 grid grid-cols-2 gap-3 text-center text-[11px] tracking-widest text-[var(--paper)]/70 md:grid-cols-4">
            <KeyHint k="A" l={t(lang, "keyA")} />
            <KeyHint k="S" l={t(lang, "keyS")} />
            <KeyHint k="D" l={t(lang, "keyD")} />
            <KeyHint k="SPACE" l={t(lang, "keySp")} />
          </div>
          <button className="menu-btn max-w-xs" onClick={begin}>
            {t(lang, "start")}
          </button>
        </div>
      )}

      {phase === "count" && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
          <div key={count} className="animate-slam font-[family-name:var(--font-display)] text-8xl text-[var(--gold)]">
            {count > 0 ? count : t(lang, "countdown")}
          </div>
        </div>
      )}

      {phase === "pause" && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80">
          <div className="mb-8 font-[family-name:var(--font-display)] text-3xl tracking-[0.4em] text-[var(--gold)]">
            {t(lang, "pause")}
          </div>
          <div className="flex w-64 flex-col gap-3">
            <button
              className="menu-btn"
              onClick={() => {
                engineRef.current?.resume();
                setPhase("play");
              }}
            >
              {t(lang, "resume")}
            </button>
            <button className="menu-btn" onClick={onExit}>
              {t(lang, "quit")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Meter({
  label,
  value,
  color,
  fire,
}: {
  label: string;
  value: number;
  color: string;
  fire?: boolean;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[10px] uppercase tracking-[0.3em] text-[var(--paper)]/50">
        <span>{label}</span>
        <span style={{ color }}>{Math.round(value)}</span>
      </div>
      <div className="h-2 overflow-hidden bg-white/10">
        <div className="h-full transition-all" style={{ width: `${value}%`, background: color }} />
      </div>
      {fire && (
        <div className="mt-1 text-xs" style={{ color, animation: "anger-flicker 0.4s infinite" }}>
          🔥🔥🔥
        </div>
      )}
    </div>
  );
}

function KeyHint({ k, l }: { k: string; l: string }) {
  return (
    <div className="border border-[var(--gold)]/30 px-3 py-2">
      <div className="text-[var(--gold)]">{k}</div>
      <div>{l}</div>
    </div>
  );
}
