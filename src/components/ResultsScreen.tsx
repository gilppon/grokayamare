import { useCallback, useState } from "react";
import type { GameResult, Lang, StageDef } from "../types";
import { t } from "../data/i18n";
import { CHARACTERS } from "../data/characters";
import { cn } from "../utils/cn";

const GRADE_COLOR: Record<string, string> = {
  F: "#ff3b5c",
  D: "#ff6b35",
  C: "#ffb347",
  B: "#8ec8ff",
  A: "#7ef0c3",
  S: "#ffe9a0",
  SS: "#ffe9a0",
  SSS: "#fff",
  "DOGEZA MASTER": "#e84a7f",
};

export function ResultsScreen({
  lang,
  stage,
  result,
  onRetry,
  onStages,
}: {
  lang: Lang;
  stage: StageDef;
  result: GameResult;
  onRetry: () => void;
  onStages: () => void;
}) {
  const char = CHARACTERS.find((c) => c.id === result.characterId);
  const delta = ((result.stock - result.stockStart) / result.stockStart) * 100;
  const j = result.judgments;
  const headline = t(lang, `ending_${result.ending}`);
  const [shared, setShared] = useState(false);
  const shareText =
    `[SUMIMASEN!] ${result.grade} · ${result.score.toLocaleString()}pts · ` +
    `ACC ${result.accuracy.toFixed(1)}% · COMBO ${result.maxCombo} · ` +
    `${stage.title[lang]} #SUMIMASEN`;
  const share = useCallback(() => {
    const nav = navigator as Navigator & { share?: (d: { title: string; text: string }) => Promise<void> };
    if (typeof nav.share === "function") {
      nav.share({ title: "SUMIMASEN!", text: shareText }).catch(() => { /* dismissed */ });
      return;
    }
    navigator.clipboard?.writeText(shareText).then(() => {
      setShared(true);
      window.setTimeout(() => setShared(false), 1800);
    }).catch(() => { /* noop */ });
  }, [shareText]);

  return (
    <div className="film-grain relative h-full overflow-y-auto bg-[#07060c]">
      <img src="/images/results-bg.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-black/90" />

      <div className="relative z-10 mx-auto max-w-3xl px-5 py-10">
        <div className="text-center">
          <div className="text-[10px] tracking-[0.5em] text-[var(--gold)]">{t(lang, "result")}</div>
          <div className="mt-2 font-[family-name:var(--font-jp)] text-2xl text-white md:text-3xl">
            {stage.title[lang]}
          </div>
          <div className="gold-line mx-auto my-5 w-40" />
          <div
            className="animate-grade font-[family-name:var(--font-display)] text-6xl tracking-[0.12em] md:text-8xl"
            style={{ color: GRADE_COLOR[result.grade] || "#ffe9a0", textShadow: "0 0 32px currentColor" }}
          >
            {result.grade}
          </div>
          <div className="mt-4 font-[family-name:var(--font-jp)] text-lg text-[var(--paper)]">{headline}</div>
          {result.ending === "secret" && (
            <div className="mt-2 text-[10px] tracking-[0.4em] text-[var(--gold)]">{t(lang, "secretHint")}</div>
          )}
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <Stat label={t(lang, "score")} value={result.score.toLocaleString()} />
          <Stat label={t(lang, "combo")} value={`${result.maxCombo}`} sub={result.comboName} />
          <Stat label={t(lang, "accuracy")} value={`${result.accuracy.toFixed(1)}%`} />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="press-card p-4">
            <div className="text-[10px] tracking-[0.3em] text-[var(--paper)]/50">{t(lang, "anger")}</div>
            <div className="mt-1 flex items-end justify-between">
              <div className="font-[family-name:var(--font-mono)] text-3xl text-[#ff3b5c]">
                {Math.round(result.anger)}
              </div>
              <div className="h-2 w-40 overflow-hidden bg-white/10">
                <div className="h-full bg-[#ff3b5c]" style={{ width: `${result.anger}%` }} />
              </div>
            </div>
          </div>
          <div className="press-card p-4">
            <div className="text-[10px] tracking-[0.3em] text-[var(--paper)]/50">{t(lang, "stock")}</div>
            <div
              className={cn(
                "font-[family-name:var(--font-mono)] text-3xl",
                delta >= 0 ? "text-[var(--stock-up)]" : "text-[var(--stock-down)]",
              )}
            >
              ¥{Math.round(result.stock).toLocaleString()}
            </div>
            <div className={delta >= 0 ? "text-[var(--stock-up)]" : "text-[var(--stock-down)]"}>
              {delta >= 0 ? "▲" : "▼"} {delta.toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="press-card mt-4 grid grid-cols-3 gap-2 p-4 text-center text-xs md:grid-cols-6">
          {["PERFECT", "GREAT", "GOOD", "BAD", "MISS", "INSUFFICIENT"].map((k) => (
            <div key={k}>
              <div className="tracking-widest text-[var(--paper)]/40">{k.slice(0, 4)}</div>
              <div className="font-[family-name:var(--font-mono)] text-lg text-white">{j[k] || 0}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-4 press-card p-3">
          {char && <img src={char.portrait} alt="" className="h-16 w-16 object-cover object-top" />}
          <div>
            <div className="text-[10px] tracking-widest text-[var(--gold)]">{char?.title[lang]}</div>
            <div className="text-white">{char?.name[lang]}</div>
            <div className="text-xs text-[var(--paper)]/50">
              DOGEZA PERFECT × {result.dogezaPerfects} / {result.totalNotes} NOTES
            </div>
          </div>
        </div>

        <div className="mx-auto mt-10 flex max-w-md flex-col gap-3">
          <button className="menu-btn" onClick={onRetry}>
            {t(lang, "retry")}
          </button>
          <button className="menu-btn" onClick={share}>
            {shared ? t(lang, "shared") : t(lang, "share")}
          </button>
          <button className="menu-btn" onClick={onStages}>
            {t(lang, "stages")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="press-card p-4 text-center">
      <div className="text-[10px] tracking-[0.3em] text-[var(--paper)]/50">{label}</div>
      <div className="font-[family-name:var(--font-mono)] text-2xl text-white">{value}</div>
      {sub && <div className="text-[10px] tracking-widest text-[var(--gold)]">{sub}</div>}
    </div>
  );
}
