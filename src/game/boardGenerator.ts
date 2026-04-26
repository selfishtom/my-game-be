// backend/src/game/boardGenerator.ts
import { GAME_CONSTANTS, WORD_COLORS } from "../utils/constants.js";

export interface GameWord {
  word: string;
  color: "red" | "blue" | "neutral" | "assassin";
  isRevealed: boolean;
}

// تابع شافل (تصادفی‌سازی)
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// تابع تعیین تیم شروع‌کننده بر اساس تعداد کارت‌ها
export function getStartingTeam(): "red" | "blue" {
  // طبق قانون: تیمی که کارت بیشتری دارد شروع می‌کند (آبی 9 تایی)
  return GAME_CONSTANTS.BLUE_WORDS_COUNT > GAME_CONSTANTS.RED_WORDS_COUNT
    ? "blue"
    : "red";
}

// محاسبه تعداد کارت‌های باقی‌مانده هر تیم
export function calculateRemainingWords(
  words: GameWord[],
  team: "red" | "blue",
): number {
  return words.filter((w) => w.color === team && !w.isRevealed).length;
}

// باز کردن یک کارت و برگرداندن نتیجه
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

// تولید صفحه بازی 25 کارتی (موقتاً با کلمات نمونه)
export function generateBoard(): GameWord[] {
  // کلمات نمونه برای تست
  const sampleWords: GameWord[] = [
    { word: "آب", color: "red", isRevealed: false },
    { word: "آتش", color: "blue", isRevealed: false },
    { word: "باد", color: "neutral", isRevealed: false },
    { word: "زمین", color: "red", isRevealed: false },
    { word: "آسمان", color: "blue", isRevealed: false },
    { word: "دریا", color: "neutral", isRevealed: false },
    { word: "کوه", color: "red", isRevealed: false },
    { word: "جنگل", color: "blue", isRevealed: false },
    { word: "صحرا", color: "neutral", isRevealed: false },
    { word: "ستاره", color: "red", isRevealed: false },
    { word: "ماه", color: "blue", isRevealed: false },
    { word: "خورشید", color: "neutral", isRevealed: false },
    { word: "ابر", color: "red", isRevealed: false },
    { word: "باران", color: "blue", isRevealed: false },
    { word: "برف", color: "neutral", isRevealed: false },
    { word: "رعد", color: "red", isRevealed: false },
    { word: "برق", color: "blue", isRevealed: false },
    { word: "طوفان", color: "assassin", isRevealed: false },
    { word: "کتاب", color: "neutral", isRevealed: false },
    { word: "قلم", color: "neutral", isRevealed: false },
    { word: "مدرسه", color: "neutral", isRevealed: false },
    { word: "دانشگاه", color: "neutral", isRevealed: false },
    { word: "معلم", color: "neutral", isRevealed: false },
    { word: "دانش آموز", color: "neutral", isRevealed: false },
    { word: "ریاضی", color: "neutral", isRevealed: false },
  ];

  // شافل نهایی (تصادفی کردن چینش کارت‌ها)
  return shuffleArray(sampleWords);
}
