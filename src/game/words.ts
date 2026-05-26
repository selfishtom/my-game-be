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

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getAllWords(): string[] {
  const allWords: string[] = [];
  for (const category of Object.values(wordsData)) {
    allWords.push(...category);
  }
  return allWords;
}

// 🔥 دریافت کلمات تصادفی از یک دسته با امکان گرفتن از همه دسته‌ها در صورت نیاز
export function getRandomWords(count: number): string[] {
  const allWords = getAllWords();
  const shuffled = shuffleArray(allWords);

  // اگر تعداد کلمات کافی نیست، از کلمات تکراری استفاده کن
  if (allWords.length < count) {
    console.warn(
      `⚠️ Not enough unique words! Need ${count}, have ${allWords.length}. Allowing reuse.`,
    );
    const fallback = [
      "الماس",
      "یاقوت",
      "زمرد",
      "مرجان",
      "فیروزه",
      "لعل",
      "دُر",
    ];
    while (shuffled.length < count) {
      shuffled.push(fallback[shuffled.length % fallback.length]);
    }
  }

  return shuffled.slice(0, count);
}

export const WORDS_DB = wordsData;
