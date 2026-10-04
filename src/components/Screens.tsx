import { useEffect, useState } from "react";
import type { CharacterId, Lang, StageDef } from "../types";
import { t } from "../data/i18n";
import { CHARACTERS } from "../data/characters";
import { STAGES, dailyStage } from "../data/stages";
import { TICKER_ITEMS } from "../data/sns";
import { BowCharacter } from "./BowCharacter";
import { cn } from "../utils/cn";

export function TitleScreen({
  lang,
  setLang,
  onPlay,
  onHow,
  onCredits,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
  onPlay: () => void;
  onHow: () => void;
  onCredits: () => void;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const onKey = () => setArmed(true);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="film-grain relative h-full w-full overflow-hidden" onClick={() => setArmed(true)}>
      <img src="/images/title-bg.jpg" alt="" className="animate-kenburns absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/90" />

      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-center justify-between px-6 py-5">
          <div className="text-[10px] tracking-[0.5em] text-[var(--gold)]">BOW TO THE BEAT</div>
          <div className="flex gap-1">
            {(["ja", "en", "ko"] as Lang[]).map((l) => (
              <button
                key={l}
                className={cn("lang-pill", lang === l && "active")}
                onClick={(e) => {
                  e.stopPropagation();
                  setLang(l);
                }}
              >
                {l === "ja" ? "日本語" : l === "ko" ? "한국어" : "EN"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4">
          <div className="animate-title-in mb-2 font-[family-name:var(--font-jp)] text-sm tracking-[0.5em] text-[var(--gold)] md:text-base">
            {t(lang, "jpTitle")}
          </div>
          <h1 className="animate-title-in font-[family-name:var(--font-display)] text-5xl font-black tracking-[0.18em] text-white md:text-8xl">
            SUMIMASEN!
          </h1>
          <div className="gold-line my-5 w-64 md:w-96" />
          <p className="animate-rise mb-10 text-center text-xs tracking-[0.35em] text-[var(--paper)]/80 md:text-sm">
            {t(lang, "tagline")}
          </p>

          {!armed ? (
            <button className="animate-rise text-[11px] tracking-[0.45em] text-[var(--gold)]" style={{ animation: "pulse-gold 2s ease infinite" }}>
              {t(lang, "pressAny")}
            </button>
          ) : (
            <div className="flex w-72 flex-col gap-3">
              <button className="menu-btn" onClick={onPlay}>
                {t(lang, "play")}
              </button>
              <button className="menu-btn" onClick={onHow}>
                {t(lang, "howto")}
              </button>
              <button className="menu-btn" onClick={onCredits}>
                {t(lang, "credits")}
              </button>
            </div>
          )}
        </div>

        <div className="relative h-8 overflow-hidden border-t border-[var(--gold)]/20 bg-black/60">
          <div className="animate-ticker absolute flex whitespace-nowrap font-[family-name:var(--font-mono)] text-xs leading-8 text-[var(--gold)]">
            {[...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS].map((s, i) => (
              <span key={i} className="mx-6">
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function HowToPlay({ lang, onBack }: { lang: Lang; onBack: () => void }) {
  const items = [
    ["howto1t", "howto1"],
    ["howto2t", "howto2"],
    ["howto3t", "howto3"],
    ["howto4t", "howto4"],
    ["howto5t", "howto5"],
  ] as const;
  return (
    <div className="film-grain relative h-full overflow-y-auto bg-[#07060c]">
      <img src="/images/title-bg.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative z-10 mx-auto max-w-3xl px-6 py-10">
        <button className="mb-8 lang-pill" onClick={onBack}>
          ← {t(lang, "back")}
        </button>
        <h2 className="mb-8 font-[family-name:var(--font-display)] text-3xl tracking-[0.3em] text-[var(--gold)]">
          {t(lang, "howto")}
        </h2>
        <div className="space-y-6">
          {items.map(([a, b], i) => (
            <div key={a} className="press-card p-5">
              <div className="mb-2 text-[10px] tracking-[0.4em] text-[var(--gold)]">0{i + 1}</div>
              <div className="mb-2 font-[family-name:var(--font-display)] text-lg tracking-widest text-white">
                {t(lang, a)}
              </div>
              <p className="text-sm leading-relaxed text-[var(--paper)]/75">{t(lang, b)}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["A", t(lang, "keyA"), "#7ec8e3"],
            ["S", t(lang, "keyS"), "#e0b44a"],
            ["D", t(lang, "keyD"), "#ff6b35"],
            ["SPACE", t(lang, "keySp"), "#e84a7f"],
          ].map(([k, l, c]) => (
            <div key={k} className="press-card p-4 text-center" style={{ borderColor: c as string }}>
              <div className="font-[family-name:var(--font-display)] text-xl" style={{ color: c as string }}>
                {k}
              </div>
              <div className="mt-1 text-[11px] tracking-widest text-[var(--paper)]/70">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CharacterSelect({
  lang,
  selected,
  onSelect,
  onNext,
  onBack,
}: {
  lang: Lang;
  selected: CharacterId;
  onSelect: (id: CharacterId) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const cur = CHARACTERS.find((c) => c.id === selected)!;
  return (
    <div className="film-grain relative h-full overflow-hidden bg-[#07060c]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(224,180,74,0.12),transparent_55%)]" />
      <div className="relative z-10 flex h-full flex-col px-6 py-6">
        <div className="flex items-center justify-between">
          <button className="lang-pill" onClick={onBack}>
            ← {t(lang, "back")}
          </button>
          <h2 className="font-[family-name:var(--font-display)] text-sm tracking-[0.4em] text-[var(--gold)] md:text-xl">
            {t(lang, "selectChar")}
          </h2>
          <button className="lang-pill active" onClick={onNext}>
            {t(lang, "next")} →
          </button>
        </div>

        <div className="mt-6 grid min-h-0 flex-1 grid-cols-1 gap-6 md:grid-cols-[1fr_280px]">
          <div className="flex items-center justify-center">
            <BowCharacter character={selected} pose="idle" emotion="sorry" />
          </div>
          <div className="press-card overflow-hidden">
            <img src={cur.portrait} alt="" className="h-56 w-full object-cover object-top" />
            <div className="p-4">
              <div className="text-[10px] tracking-[0.35em] text-[var(--gold)]">{cur.title[lang]}</div>
              <div className="font-[family-name:var(--font-jp)] text-2xl text-white">{cur.name[lang]}</div>
              <p className="mt-3 text-sm leading-relaxed text-[var(--paper)]/70">{cur.blurb[lang]}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] uppercase tracking-widest text-[var(--paper)]/50">
                <span>SCORE ×{cur.scoreMul.toFixed(2)}</span>
                <span>WINDOW ×{cur.windowMul.toFixed(2)}</span>
                <span>STOCK ×{cur.stockMul.toFixed(2)}</span>
                <span>ANGER ×{cur.angerMul.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
          {CHARACTERS.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={cn(
                "min-w-[140px] overflow-hidden border transition",
                selected === c.id ? "border-[var(--gold)]" : "border-white/10 opacity-70 hover:opacity-100",
              )}
            >
              <img src={c.portrait} alt="" className="h-28 w-full object-cover object-top" />
              <div className="bg-black/70 px-2 py-2 text-left">
                <div className="text-[10px] tracking-widest text-[var(--gold)]">{c.title[lang]}</div>
                <div className="text-xs text-white">{c.name[lang]}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function StageSelect({
  lang,
  unlocked,
  highs,
  onPick,
  onBack,
  onDaily,
}: {
  lang: Lang;
  unlocked: string[];
  highs: Record<string, number>;
  onPick: (s: StageDef) => void;
  onBack: () => void;
  onDaily: () => void;
}) {
  const daily = dailyStage();
  return (
    <div className="film-grain relative h-full overflow-y-auto bg-[#07060c]">
      <img src="/images/game-bg.jpg" alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25" />
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative z-10 mx-auto max-w-5xl px-5 py-8">
        <div className="mb-8 flex items-center justify-between">
          <button className="lang-pill" onClick={onBack}>
            ← {t(lang, "back")}
          </button>
          <h2 className="font-[family-name:var(--font-display)] text-sm tracking-[0.4em] text-[var(--gold)] md:text-xl">
            {t(lang, "selectStage")}
          </h2>
          <div className="w-16" />
        </div>

        <button
          onClick={onDaily}
          className="press-card mb-6 flex w-full items-center justify-between p-5 text-left hover:border-[var(--gold)]"
        >
          <div>
            <div className="text-[10px] tracking-[0.4em] text-[var(--gold)]">{t(lang, "daily")}</div>
            <div className="font-[family-name:var(--font-jp)] text-xl text-white">{daily.title[lang]}</div>
            <div className="text-xs text-[var(--paper)]/60">{daily.scandal[lang]}</div>
          </div>
          <div className="font-[family-name:var(--font-mono)] text-[var(--gold)]">BPM {daily.bpm}</div>
        </button>

        <div className="grid gap-4 md:grid-cols-2">
          {STAGES.map((s) => {
            const open = unlocked.includes(s.id) || s.number === 1;
            return (
              <button
                key={s.id}
                disabled={!open}
                onClick={() => open && onPick(s)}
                className={cn(
                  "press-card p-5 text-left transition",
                  open ? "hover:border-[var(--gold)]" : "opacity-40",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] tracking-[0.35em] text-[var(--gold)]">
                      {t(lang, "chapter")} {s.chapter || 1} — STAGE {s.number}
                    </div>
                    <div className="mt-1 font-[family-name:var(--font-jp)] text-xl text-white">{s.title[lang]}</div>
                    <div className="text-xs text-[var(--paper)]/55">{s.subtitle[lang]}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[var(--gold)]">{"★".repeat(s.difficulty)}</div>
                    <div className="font-[family-name:var(--font-mono)] text-xs text-white/50">BPM {s.bpm}</div>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[var(--paper)]/70">{s.scandal[lang]}</p>
                <div className="mt-3 flex justify-between text-[10px] tracking-widest text-[var(--paper)]/40">
                  <span>{open ? `¥${s.startStock.toLocaleString()}` : t(lang, "locked")}</span>
                  {highs[s.id] ? (
                    <span>
                      {t(lang, "highScore")} {highs[s.id].toLocaleString()}
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function CreditsScreen({ lang, onBack }: { lang: Lang; onBack: () => void }) {
  const rows = [
    ["Director", "Bow Tanaka"],
    ["Rhythm Design", "Kenji Hold"],
    ["Apology Consultant", "土下座 太郎"],
    ["Press Wrangler", "Flash Sato"],
    ["Stock Manipulation", "¥. Kuroko"],
    ["SNS Intern", "@clip_factory"],
    ["Camera #47", "still shooting"],
  ];
  return (
    <div className="film-grain relative flex h-full flex-col items-center justify-center bg-[#07060c] px-6">
      <img src="/images/results-bg.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative z-10 max-w-lg text-center">
        <div className="font-[family-name:var(--font-jp)] text-sm tracking-[0.5em] text-[var(--gold)]">
          {t(lang, "jpTitle")}
        </div>
        <h2 className="mb-2 font-[family-name:var(--font-display)] text-5xl text-white">SUMIMASEN!</h2>
        <p className="mb-10 text-sm text-[var(--paper)]/70">{t(lang, "creditsBody")}</p>
        <div className="space-y-3">
          {rows.map(([a, b]) => (
            <div key={a} className="flex justify-between gap-8 text-sm">
              <span className="tracking-widest text-[var(--gold)]/80">{a}</span>
              <span className="text-white">{b}</span>
            </div>
          ))}
        </div>
        <p className="mt-10 text-xs tracking-[0.3em] text-[var(--paper)]/50">{t(lang, "made")}</p>
        <button className="menu-btn mx-auto mt-10 max-w-xs" onClick={onBack}>
          {t(lang, "back")}
        </button>
      </div>
    </div>
  );
}
