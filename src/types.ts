export type Lang = "en" | "ja" | "ko";
export type NoteType = "15" | "45" | "90" | "dogeza";
export type Judgment =
  | "PERFECT"
  | "GREAT"
  | "GOOD"
  | "BAD"
  | "MISS"
  | "INSUFFICIENT"
  | "OVERAPOLOGY"
  | "EARLY_RISE"
  | "TOO_LONG";
export type Pose = "idle" | "15" | "45" | "90" | "dogeza";
export type CharacterId = "salaryman" | "ceo" | "startup" | "ai" | "politician";
export type JournalistId =
  | "rookie"
  | "economic"
  | "investigative"
  | "internet"
  | "veteran"
  | "boss";
export type MusicStyle = "jazz" | "corporate" | "electro" | "dnb" | "core";
export type Screen =
  | "title"
  | "howto"
  | "chars"
  | "stages"
  | "game"
  | "results"
  | "credits";
export type Ending = "perfect" | "normal" | "bad" | "disaster" | "secret";
export type Grade = "F" | "D" | "C" | "B" | "A" | "S" | "SS" | "SSS" | "DOGEZA MASTER";

export interface I18nText {
  en: string;
  ja: string;
  ko: string;
}

export interface ChartNote {
  id: number;
  beat: number;
  time: number;
  type: NoteType;
  durationBeats: number;
  duration: number;
  question?: I18nText;
  journalist?: JournalistId;
  hint?: boolean;
}

export interface StageDef {
  id: string;
  chapter: number;
  number: number;
  title: I18nText;
  subtitle: I18nText;
  scandal: I18nText;
  bpm: number;
  style: MusicStyle;
  difficulty: number;
  startStock: number;
  startAnger: number;
  durationBeats: number;
  notes: RawNote[];
}

export type RawNote = {
  b: number;
  t: NoteType;
  d?: number;
  q?: string;
  j?: JournalistId;
  hint?: boolean;
};

export interface CharacterDef {
  id: CharacterId;
  name: I18nText;
  title: I18nText;
  blurb: I18nText;
  plate: string;
  scoreMul: number;
  windowMul: number;
  stockMul: number;
  angerMul: number;
  portrait: string;
}

export interface GameResult {
  stageId: string;
  characterId: CharacterId;
  score: number;
  maxCombo: number;
  comboName: string;
  judgments: Record<string, number>;
  accuracy: number;
  anger: number;
  stock: number;
  stockStart: number;
  grade: Grade;
  ending: Ending;
  dogezaPerfects: number;
  totalNotes: number;
}

export interface SnsPost {
  id: number;
  user: string;
  text: string;
  time: string;
}

export interface HudSnapshot {
  score: number;
  combo: number;
  comboName: string;
  anger: number;
  stock: number;
  stockDelta: number;
  gauge: number;
  judgment: Judgment | null;
  judgmentId: number;
  question: I18nText | null;
  journalist: JournalistId | null;
  pose: Pose;
  emotion: "idle" | "focused" | "panicked" | "sorry";
  sns: SnsPost[];
  flash: number;
  shake: boolean;
  missFreeze: boolean;
  roast: I18nText | null;
  progress: number;
  beat: number;
}
