import { useCallback, useMemo, useRef, useState } from "react";
import type { CharacterId, GameResult, Lang, Screen, StageDef } from "./types";
import { AudioEngine } from "./audio/AudioEngine";
import { STAGES, dailyStage } from "./data/stages";
import { TitleScreen, HowToPlay, CharacterSelect, StageSelect, CreditsScreen } from "./components/Screens";
import { GameScreen } from "./components/GameScreen";
import { ResultsScreen } from "./components/ResultsScreen";

const SAVE = "sumimasen-save-v1";

function loadSave() {
  const fallback = { unlocked: ["sns"], highs: {} as Record<string, number>, lang: "en" as Lang };
  try {
    const raw = localStorage.getItem(SAVE);
    if (!raw) return fallback;
    const v = JSON.parse(raw) as Partial<typeof fallback>;
    const lang: Lang = v.lang === "ko" || v.lang === "ja" || v.lang === "en" ? v.lang : "en";
    const unlocked = Array.isArray(v.unlocked) ? v.unlocked.filter((x): x is string => typeof x === "string").map((x) => x.slice(0, 32)) : fallback.unlocked;
    const highs: Record<string, number> = {};
    if (v.highs && typeof v.highs === "object") {
      for (const [k, val] of Object.entries(v.highs)) {
        if (typeof val === "number" && Number.isFinite(val) && val >= 0 && val < 1e9) highs[k.slice(0, 64)] = val;
      }
    }
    return { unlocked, highs, lang };
  } catch {
    return fallback;
  }
}

export default function App() {
  const initial = useMemo(loadSave, []);
  const [screen, setScreen] = useState<Screen>("title");
  const [lang, setLang] = useState<Lang>(initial.lang || "en");
  const [character, setCharacter] = useState<CharacterId>("salaryman");
  const [stage, setStage] = useState<StageDef>(STAGES[0]);
  const [result, setResult] = useState<GameResult | null>(null);
  const [unlocked, setUnlocked] = useState<string[]>(initial.unlocked);
  const [highs, setHighs] = useState<Record<string, number>>(initial.highs);
  const audioRef = useRef<AudioEngine | null>(null);
  const audio = useMemo(() => (audioRef.current ??= new AudioEngine()), []);

  const persist = useCallback(
    (u = unlocked, h = highs, l = lang) => {
      localStorage.setItem(SAVE, JSON.stringify({ unlocked: u, highs: h, lang: l }));
    },
    [unlocked, highs, lang],
  );

  const changeLang = (l: Lang) => {
    setLang(l);
    persist(unlocked, highs, l);
  };

  const onResult = useCallback(
    (r: GameResult) => {
      setResult(r);
      setScreen("results");
      const nextHighs = { ...highs, [r.stageId]: Math.max(highs[r.stageId] || 0, r.score) };
      setHighs(nextHighs);
      const idx = STAGES.findIndex((s) => s.id === r.stageId);
      let nextUnlock = unlocked;
      if (idx >= 0 && idx < STAGES.length - 1 && r.accuracy >= 45) {
        const nid = STAGES[idx + 1].id;
        if (!unlocked.includes(nid)) nextUnlock = [...unlocked, nid];
        setUnlocked(nextUnlock);
      }
      persist(nextUnlock, nextHighs, lang);
    },
    [highs, unlocked, lang, persist],
  );

  const playStage = (s: StageDef) => {
    setStage(s);
    setResult(null);
    setScreen("game");
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#07060c]">
      {screen === "title" && (
        <TitleScreen
          lang={lang}
          setLang={changeLang}
          onPlay={() => setScreen("chars")}
          onHow={() => setScreen("howto")}
          onCredits={() => setScreen("credits")}
        />
      )}
      {screen === "howto" && <HowToPlay lang={lang} onBack={() => setScreen("title")} />}
      {screen === "credits" && <CreditsScreen lang={lang} onBack={() => setScreen("title")} />}
      {screen === "chars" && (
        <CharacterSelect
          lang={lang}
          selected={character}
          onSelect={setCharacter}
          onNext={() => setScreen("stages")}
          onBack={() => setScreen("title")}
        />
      )}
      {screen === "stages" && (
        <StageSelect
          lang={lang}
          unlocked={unlocked}
          highs={highs}
          onPick={playStage}
          onBack={() => setScreen("chars")}
          onDaily={() => playStage(dailyStage())}
        />
      )}
      {screen === "game" && (
        <GameScreen
          stage={stage}
          characterId={character}
          lang={lang}
          audio={audio}
          onExit={() => setScreen("stages")}
          onResult={onResult}
        />
      )}
      {screen === "results" && result && (
        <ResultsScreen
          lang={lang}
          stage={stage}
          result={result}
          onRetry={() => playStage(stage)}
          onStages={() => setScreen("stages")}
        />
      )}
    </div>
  );
}
