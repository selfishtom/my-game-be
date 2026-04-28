// backend/src/game/boardGenerator.ts
import { GAME_CONSTANTS, WORD_COLORS } from "../utils/constants.js";
import { generateBoardWords } from "./words.js";

export interface GameWord {
  word: string;
  color: "red" | "blue" | "neutral" | "assassin";
  isRevealed: boolean;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// 🔥 تعیین تیم شروع‌کننده به صورت تصادفی (50% شانس)
export function getStartingTeam(): "red" | "blue" {
  const isBlueStarting = Math.random() < 0.5;
  return isBlueStarting ? "blue" : "red";
}

// 🔥 تعیین اینکه کدام تیم 9 کلمه دارد (تصادفی 50%)
function getRandomTeamWithNineWords(): "red" | "blue" {
  const isBlueNine = Math.random() < 0.5;
  return isBlueNine ? "blue" : "red";
}

export function calculateRemainingWords(
  words: GameWord[],
  team: "red" | "blue",
): number {
  return words.filter((w) => w.color === team && !w.isRevealed).length;
}

export function revealWord(
  words: GameWord[],
  index: number,
): { color: string; isGameOver: boolean } {
  if (index < 0 || index >= words.length) {
    throw new Error("Invalid word index");
  }

  const word = words[index];
  if (word.isRevealed) {
    throw new Error("Word already revealed");
  }

  word.isRevealed = true;
  const isGameOver = word.color === WORD_COLORS.ASSASSIN;

  return { color: word.color, isGameOver };
}

export function generateBoard(): GameWord[] {
  const { allWordsWithColors } = generateBoardWords();

  // تعیین تصادفی کدام تیم 9 کلمه دارد
  const teamWithNine = getRandomTeamWithNineWords();

  console.log(
    `🎲 Randomly selected: ${teamWithNine === "red" ? "🔴 Red" : "🔵 Blue"} team has 9 words`,
  );

  // فیلتر کردن کلمات بر اساس تیم
  let redWords = allWordsWithColors.filter((w) => w.color === "red");
  let blueWords = allWordsWithColors.filter((w) => w.color === "blue");
  let neutralWords = allWordsWithColors.filter((w) => w.color === "neutral");
  let assassinWords = allWordsWithColors.filter((w) => w.color === "assassin");

  // اگر تعداد کلمات کمتر از حد نیاز است، از بقیه کلمات استفاده کن
  const redNeeded = teamWithNine === "red" ? 9 : 8;
  const blueNeeded = teamWithNine === "blue" ? 9 : 8;

  while (redWords.length < redNeeded) {
    redWords.push({ word: "کلمه اضافی", color: "red" });
  }
  while (blueWords.length < blueNeeded) {
    blueWords.push({ word: "کلمه اضافی", color: "blue" });
  }
  while (neutralWords.length < GAME_CONSTANTS.NEUTRAL_WORDS_COUNT) {
    neutralWords.push({ word: "خنثی", color: "neutral" });
  }
  while (assassinWords.length < GAME_CONSTANTS.ASSASSIN_WORDS_COUNT) {
    assassinWords.push({ word: "قاتل", color: "assassin" });
  }

  // برش به تعداد دقیق
  redWords = redWords.slice(0, redNeeded);
  blueWords = blueWords.slice(0, blueNeeded);
  neutralWords = neutralWords.slice(0, GAME_CONSTANTS.NEUTRAL_WORDS_COUNT);
  assassinWords = assassinWords.slice(0, GAME_CONSTANTS.ASSASSIN_WORDS_COUNT);

  // ترکیب همه کلمات
  let allWords: { word: string; color: string }[] = [
    ...redWords,
    ...blueWords,
    ...neutralWords,
    ...assassinWords,
  ];

  // شافل نهایی
  allWords = shuffleArray(allWords);

  console.log(
    `📊 Board stats: 🔴 Red: ${redWords.length}, 🔵 Blue: ${blueWords.length}, ⚪ Neutral: ${neutralWords.length}, 💀 Assassin: ${assassinWords.length}`,
  );

  return allWords.map((w) => ({
    word: w.word,
    color: w.color as "red" | "blue" | "neutral" | "assassin",
    isRevealed: false,
  }));
}
