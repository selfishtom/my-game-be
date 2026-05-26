// backend/src/game/boardGenerator.ts
import { GAME_CONSTANTS, WORD_COLORS } from "../utils/constants.js";
import { getAllWords, getRandomWords, shuffleArray } from "./words.js";

export interface GameWord {
  word: string;
  color: "red" | "blue" | "neutral" | "assassin";
  isRevealed: boolean;
}

// 🔥 تعیین تیم شروع‌کننده به صورت تصادفی (50% شانس)
export function getStartingTeam(): "red" | "blue" {
  return Math.random() < 0.5 ? "blue" : "red";
}

// 🔥 تعیین اینکه کدام تیم 9 کلمه دارد (تصادفی 50%)
function getRandomTeamWithNineWords(): "red" | "blue" {
  return Math.random() < 0.5 ? "blue" : "red";
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
  const allWords = getAllWords();

  // بررسی کن که کلمات کافی داریم
  if (allWords.length < GAME_CONSTANTS.TOTAL_WORDS) {
    console.error(
      `❌ Not enough words! Need ${GAME_CONSTANTS.TOTAL_WORDS}, got ${allWords.length}`,
    );

    const fallbackWords = [
      "آب",
      "آتش",
      "باد",
      "زمین",
      "آسمان",
      "کوه",
      "دریا",
      "جنگل",
      "صحرا",
      "ستاره",
      "ماه",
      "خورشید",
      "ابر",
      "باران",
      "برف",
      "رعد",
      "برق",
      "طوفان",
      "کتاب",
      "قلم",
      "مدرسه",
      "دانشگاه",
      "معلم",
      "دانش‌آموز",
      "ریاضی",
    ];

    return generateBoardFromWords(fallbackWords);
  }

  const selectedWords = getRandomWords(GAME_CONSTANTS.TOTAL_WORDS);

  return generateBoardFromWords(selectedWords);
}

// 🔥 تابع کمکی برای تولید صفحه از کلمات داده شده
function generateBoardFromWords(words: string[]): GameWord[] {
  // تعیین تصادفی کدام تیم 9 کلمه دارد
  const teamWithNine = getRandomTeamWithNineWords();
  const redNeeded = teamWithNine === "red" ? 9 : 8;
  const blueNeeded = teamWithNine === "blue" ? 9 : 8;

  console.log(
    `🎲 Randomly selected: ${teamWithNine === "red" ? "🔴 Red" : "🔵 Blue"} team has 9 words`,
  );

  // ساخت آرایه رنگ‌ها
  const colors: ("red" | "blue" | "neutral" | "assassin")[] = [
    ...Array(redNeeded).fill("red"),
    ...Array(blueNeeded).fill("blue"),
    ...Array(GAME_CONSTANTS.NEUTRAL_WORDS_COUNT).fill("neutral"),
    ...Array(GAME_CONSTANTS.ASSASSIN_WORDS_COUNT).fill("assassin"),
  ];

  // شافل کردن رنگ‌ها
  const shuffledColors = shuffleArray(colors);

  // شافل کردن کلمات
  const shuffledWords = shuffleArray([...words]);

  // ساخت صفحه بازی
  const board: GameWord[] = [];
  for (let i = 0; i < GAME_CONSTANTS.TOTAL_WORDS; i++) {
    board.push({
      word: shuffledWords[i],
      color: shuffledColors[i],
      isRevealed: false,
    });
  }

  // آمار برای دیباگ
  const redCount = board.filter((w) => w.color === "red").length;
  const blueCount = board.filter((w) => w.color === "blue").length;
  const neutralCount = board.filter((w) => w.color === "neutral").length;
  const assassinCount = board.filter((w) => w.color === "assassin").length;

  console.log(
    `📊 Board stats: 🔴 Red: ${redCount}, 🔵 Blue: ${blueCount}, ⚪ Neutral: ${neutralCount}, 💀 Assassin: ${assassinCount}`,
  );

  return board;
}
