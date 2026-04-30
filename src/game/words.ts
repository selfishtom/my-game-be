// backend/src/game/words.ts
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { GAME_CONSTANTS } from "../utils/constants.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const wordsJsonPath = join(__dirname, "../data/words.json");

interface WordsCategory {
  [category: string]: string[];
}

interface WordWithCategory {
  word: string;
  category: string;
  originalIndex: number;
}

let wordsData: WordsCategory = {};

try {
  const fileContent = readFileSync(wordsJsonPath, "utf-8");
  wordsData = JSON.parse(fileContent);
  console.log("📖 Words loaded successfully from:", wordsJsonPath);

  const totalWords = Object.values(wordsData).reduce(
    (acc, arr) => acc + arr.length,
    0,
  );
  console.log(
    `📚 Total words loaded: ${totalWords} from ${Object.keys(wordsData).length} categories`,
  );
} catch (error) {
  console.error("❌ Error loading words.json:", error);
  // داده‌های پیش‌فرض اضطراری
  wordsData = {
    animals: ["animals1", "animals2", "animals3"],
    foods: ["foods1", "foods2", "foods3"],
    objects: ["objects1", "objects2", "objects3"],
    places: ["places1", "places2", "places3"],
    nature: ["nature1", "nature2", "nature3"],
    abstract: ["abstract1", "abstract2", "abstract3"],
    jobs: ["jobs1", "jobs2", "jobs3"],
  };
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getAllWords(): WordWithCategory[] {
  const result: WordWithCategory[] = [];

  for (const [category, words] of Object.entries(wordsData)) {
    words.forEach((word, index) => {
      result.push({
        word,
        category,
        originalIndex: index,
      });
    });
  }

  return result;
}

// 🔥 دریافت کلمات تصادفی از یک دسته با امکان گرفتن از همه دسته‌ها در صورت نیاز
function getRandomWords(
  count: number,
  excludeWords: Set<string> = new Set(),
): WordWithCategory[] {
  let allWords = getAllWords().filter((w) => !excludeWords.has(w.word));

  // اگر تعداد کلمات کافی نیست، از کلمات تکراری استفاده کن
  if (allWords.length < count) {
    console.warn(
      `⚠️ Not enough unique words! Need ${count}, have ${allWords.length}. Allowing reuse.`,
    );
    allWords = getAllWords(); // اجازه استفاده مجدد
  }

  const shuffled = shuffleArray(allWords);
  return shuffled.slice(0, count);
}

// 🔥 دریافت کلمات تصادفی از دسته‌های مشخص شده
function getRandomWordsFromCategories(
  categories: string[],
  count: number,
  excludeWords: Set<string> = new Set(),
): WordWithCategory[] {
  let words: WordWithCategory[] = [];

  for (const category of categories) {
    const categoryWords = getAllWords().filter(
      (w) => w.category === category && !excludeWords.has(w.word),
    );
    words = [...words, ...categoryWords];
  }

  if (words.length < count) {
    console.warn(
      `⚠️ Not enough words in categories ${categories}. Need ${count}, have ${words.length}. Getting from all categories.`,
    );
    return getRandomWords(count, excludeWords);
  }

  const shuffled = shuffleArray(words);
  return shuffled.slice(0, count);
}

export function generateBoardWords(): {
  allWordsWithColors: { word: string; color: string }[];
} {
  const allCategories = Object.keys(wordsData);
  const shuffledCategories = shuffleArray(allCategories);

  const usedWords = new Set<string>();
  const result: { word: string; color: string }[] = [];

  // تعیین تصادفی کدام تیم 9 کلمه دارد
  const teamWithNine = Math.random() < 0.5 ? "red" : "blue";
  const redTargetCount = teamWithNine === "red" ? 9 : 8;
  const blueTargetCount = teamWithNine === "blue" ? 9 : 8;

  console.log(
    `🎯 Target: 🔴 Red: ${redTargetCount}, 🔵 Blue: ${blueTargetCount}, ⚪ Neutral: 7, 💀 Assassin: 1`,
  );

  // توزیع دسته‌بندی‌ها بین رنگ‌ها
  const redCategories = shuffledCategories.slice(
    0,
    Math.max(2, Math.ceil(shuffledCategories.length / 4)),
  );
  const blueCategories = shuffledCategories.slice(
    Math.ceil(shuffledCategories.length / 4),
    Math.ceil(shuffledCategories.length / 2),
  );
  const neutralCategories = shuffledCategories.slice(
    Math.ceil(shuffledCategories.length / 2),
    Math.ceil((shuffledCategories.length * 3) / 4),
  );
  const assassinCategories = shuffledCategories.slice(
    Math.ceil((shuffledCategories.length * 3) / 4),
  );

  // 🔥 تیم قرمز
  const redWords = getRandomWordsFromCategories(
    redCategories,
    redTargetCount,
    usedWords,
  );
  for (const w of redWords) {
    usedWords.add(w.word);
    result.push({ word: w.word, color: "red" });
  }

  // 🔥 تیم آبی
  const blueWords = getRandomWordsFromCategories(
    blueCategories,
    blueTargetCount,
    usedWords,
  );
  for (const w of blueWords) {
    usedWords.add(w.word);
    result.push({ word: w.word, color: "blue" });
  }

  // 🔥 کلمات خنثی
  const neutralWords = getRandomWordsFromCategories(
    neutralCategories,
    GAME_CONSTANTS.NEUTRAL_WORDS_COUNT,
    usedWords,
  );
  for (const w of neutralWords) {
    usedWords.add(w.word);
    result.push({ word: w.word, color: "neutral" });
  }

  // 🔥 کلمات قاتل
  const assassinWords = getRandomWordsFromCategories(
    assassinCategories,
    GAME_CONSTANTS.ASSASSIN_WORDS_COUNT,
    usedWords,
  );
  for (const w of assassinWords) {
    usedWords.add(w.word);
    result.push({ word: w.word, color: "assassin" });
  }

  // شافل نهایی
  const shuffledResult = shuffleArray(result);

  console.log(
    `📊 Generated: 🔴 Red: ${redWords.length}, 🔵 Blue: ${blueWords.length}, ⚪ Neutral: ${neutralWords.length}, 💀 Assassin: ${assassinWords.length}`,
  );

  return { allWordsWithColors: shuffledResult };
}

export const WORDS_DB = wordsData;
