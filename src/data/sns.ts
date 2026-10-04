import type { Judgment } from "../types";

const USERS = [
  "@salary_soul",
  "@tokyo_uncle",
  "@stock_goblin",
  "@ apologynerd",
  "@mori_desk",
  "@neko_auditor",
  "@boardwatch",
  "@clip_factory",
  "@45do_club",
  "@dogeza_daily",
  "@주린이",
  "@사과각도학",
  "@会見ライブ",
  "@kabu_crash",
  "@hanbetsu",
];

export function snsFor(
  j: Judgment,
  combo: number,
  anger: number,
  type: string,
): { user: string; text: string } {
  const user = USERS[Math.floor(Math.random() * USERS.length)].replace(" ", "");
  const pool: string[] = [];

  if (j === "PERFECT") {
    pool.push(
      "45도는 괜찮았다.",
      "그 각도… 계산됨.",
      "timing was filthy",
      "頭の角度が美しい",
      "this ceo practices in the mirror",
      "성의를 느낌. 이상하게.",
      "株、ちょっと戻した",
      "perfect bow wtf",
    );
  } else if (j === "GREAT" || j === "GOOD") {
    pool.push(
      "무난한 사죄.",
      "일단 고개는 숙였음",
      "ordinary shame. passable.",
      "まあ普通の謝罪",
      "not enough sweat",
    );
  } else if (j === "INSUFFICIENT") {
    pool.push(
      "지금 그게 사과입니까?",
      "15도ㅋㅋㅋㅋ",
      "それが謝罪？",
      "nodded like he saw a coworker",
      "목례로 대형사고 무마 시도",
      "주식 팔았다.",
    );
  } else if (j === "OVERAPOLOGY") {
    pool.push(
      "벌써 도게자라고?",
      "너무 빨리 바닥에 감",
      "panic-dogeza detected",
      "やりすぎでは",
      "overacting. 10/10.",
    );
  } else if (j === "MISS" || j === "BAD") {
    pool.push(
      "저 사람 진짜 반성하는 거 맞음?",
      "음악이 멈췄다…",
      "the silence is so loud",
      "無音が一番つらい",
      "카메라 한 대만 찍음 ㅋㅋ",
      "CEO 해임각",
      "disaster live",
    );
  } else if (j === "EARLY_RISE") {
    pool.push(
      "사과 끝났습니까?",
      "성의가 없군요.",
      "stood up like the bell rang",
      "早すぎる",
    );
  } else if (j === "TOO_LONG") {
    pool.push(
      "질문에 답해주세요.",
      "계속 그러고 계실 겁니까?",
      "he's still down there",
      "マイクに頭が当たってない？",
    );
  }

  if (type === "dogeza") {
    pool.push(
      "도게자 타이밍 미쳤다ㅋㅋㅋ",
      "THE FLOOR ACCEPTED HIM",
      "土下座、来た",
      "national broadcast of a forehead",
    );
  }
  if (combo >= 20) pool.push("콤보가 무섭다", "apology combo going crazy", "謝りすぎ");
  if (anger > 70) pool.push("나라가 화났다", "public anger meter is a volcano", "炎上中");

  const text = pool[Math.floor(Math.random() * pool.length)] || "…";
  return { user, text };
}

export const TICKER_ITEMS = [
  "KABU CORP ¥8,200",
  "NEKO SOFT ¥1,204",
  "HONNE AI ¥440",
  "MOCHI LOGISTICS ¥88",
  "YARU KILESS ¥12",
  "APOLOGY INDEX +0.0%",
  "PUBLIC TRUST FUTURES",
  "DOGEZA ETF WATCH",
  "45° IS THE NEW 90°",
  "BOW TO THE BEAT",
];
