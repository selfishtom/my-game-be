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

  // بررسی کن که کلمات کافی داریم
  if (allWordsWithColors.length < GAME_CONSTANTS.TOTAL_WORDS) {
    console.error(
      `❌ Not enough words! Need ${GAME_CONSTANTS.TOTAL_WORDS}, got ${allWordsWithColors.length}`,
    );
    throw new Error("Not enough words to generate board");
  }

  // حذف کلمات تکراری (در صورت وجود)
  const uniqueWords = new Map();
  for (const word of allWordsWithColors) {
    if (!uniqueWords.has(word.word)) {
      uniqueWords.set(word.word, word);
    }
  }

  let words = Array.from(uniqueWords.values());

  // اگر بعد از حذف تکراری‌ها تعداد کلمات کم شد، از کلمات جایگزین استفاده کن
  if (words.length < GAME_CONSTANTS.TOTAL_WORDS) {
    console.warn(
      `⚠️ After removing duplicates, only ${words.length} unique words left`,
    );
    // کلمات پیش‌فرض زیبا (نه "کلمه اضافی"!)
    const fallbackWords = [
      { word: "آفتاب", color: "neutral" },
      { word: "مهتاب", color: "neutral" },
      { word: "ستاره", color: "neutral" },
      { word: "کهکشان", color: "neutral" },
      { word: "سیاره", color: "neutral" },
    ];
    for (
      let i = 0;
      i < fallbackWords.length && words.length < GAME_CONSTANTS.TOTAL_WORDS;
      i++
    ) {
      words.push(fallbackWords[i]);
    }
  }

  // تعیین تصادفی کدام تیم 9 کلمه دارد
  const teamWithNine = getRandomTeamWithNineWords();
  const redNeeded = teamWithNine === "red" ? 9 : 8;
  const blueNeeded = teamWithNine === "blue" ? 9 : 8;

  // فیلتر کردن بر اساس رنگ‌ها
  let redWords = words.filter((w) => w.color === "red").slice(0, redNeeded);
  let blueWords = words.filter((w) => w.color === "blue").slice(0, blueNeeded);
  let neutralWords = words
    .filter((w) => w.color === "neutral")
    .slice(0, GAME_CONSTANTS.NEUTRAL_WORDS_COUNT);
  let assassinWords = words
    .filter((w) => w.color === "assassin")
    .slice(0, GAME_CONSTANTS.ASSASSIN_WORDS_COUNT);

  // اگر تعداد کلمات یک رنگ کم بود، از بقیه رنگ‌ها جبران کن
  while (redWords.length < redNeeded) {
    redWords.push({ word: "الماس", color: "red" });
  }
  while (blueWords.length < blueNeeded) {
    blueWords.push({ word: "یاقوت", color: "blue" });
  }
  while (neutralWords.length < GAME_CONSTANTS.NEUTRAL_WORDS_COUNT) {
    neutralWords.push({ word: "طلایی", color: "neutral" });
  }
  while (assassinWords.length < GAME_CONSTANTS.ASSASSIN_WORDS_COUNT) {
    assassinWords.push({ word: "زهر", color: "assassin" });
  }

  // ترکیب همه کلمات
  let allWords = [...redWords, ...blueWords, ...neutralWords, ...assassinWords];

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
