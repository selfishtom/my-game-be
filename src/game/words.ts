// backend/src/game/words.ts
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { GAME_CONSTANTS } from "../utils/constants.js";

// دریافت مسیر فایل JSON (در محیط ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const wordsJsonPath = join(__dirname, "../../../data/words.json");

// تایپ برای ساختار JSON
interface WordsCategory {
  [category: string]: string[];
}

// تایپ برای کلمه با دسته‌بندی
interface WordWithCategory {
  word: string;
  category: string;
  index: number; // شماره اندیس اصلی کلمه
}

// خواندن فایل JSON
let wordsData: WordsCategory = {};

try {
  const fileContent = readFileSync(wordsJsonPath, "utf-8");
  wordsData = JSON.parse(fileContent);
  console.log("📖 Words loaded successfully from:", wordsJsonPath);

  // آمار بارگذاری
  const totalWords = Object.values(wordsData).reduce(
    (acc, arr) => acc + arr.length,
    0,
  );
  console.log(
    `📚 Total words loaded: ${totalWords} from ${Object.keys(wordsData).length} categories`,
  );
} catch (error) {
  console.error("❌ Error loading words.json:", error);
  // داده‌های پیش‌فرض در صورت خطا
  wordsData = {
    animals: ["سگ", "گربه", "اسب", "گاو", "گوسفند", "شیر"],
    foods: ["برنج", "نان", "پنیر", "کره", "عسل"],
    objects: ["میز", "صندلی", "کتاب", "خودکار", "مداد"],
    places: [
      "مدرسه",
      "دانشگاه",
      "بیمارستان",
      "پارک",
      "سینما",
      "رستوران",
      "فرودگاه",
    ],
    nature: ["کوه", "دریا", "رود", "جنگل", "دشت", "بیابان"],
    jobs: ["پزشک", "مهندس", "معلم", "برنامه‌نویس", "راننده", "خلبان", "آشپز"],
    abstract: ["عشق", "نفرت", "امید", "ترس", "شادی", "غم", "موفقیت"],
  };
}

// تبدیل کلمات به فرمت با دسته‌بندی و اندیس
function getWordsWithCategories(): WordWithCategory[] {
  const result: WordWithCategory[] = [];

  for (const [category, words] of Object.entries(wordsData)) {
    words.forEach((word, index) => {
      // جدا کردن شماره اگر در کلمه باشد
      let cleanWord = word;
      let originalIndex = index;

      // اگر کلمه به فرمت "کلمه_شماره" بود
      const underscoreIndex = word.lastIndexOf("_");
      if (underscoreIndex !== -1) {
        const possibleNumber = word.substring(underscoreIndex + 1);
        if (!isNaN(Number(possibleNumber))) {
          cleanWord = word.substring(0, underscoreIndex);
          originalIndex = Number(possibleNumber);
        }
      }

      result.push({
        word: cleanWord,
        category,
        index: originalIndex,
      });
    });
  }

  return result;
}

// شافل (تصادفی‌سازی) آرایه
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// انتخاب تصادفی N کلمه از یک دسته
function getRandomWordsFromCategory(
  category: string,
  count: number,
): WordWithCategory[] {
  const categoryWords = getWordsWithCategories().filter(
    (w) => w.category === category,
  );
  const shuffled = shuffleArray(categoryWords);
  return shuffled.slice(0, count);
}

// انتخاب تصادفی از کل کلمات (بدون تکرار)
function getRandomUniqueWords(
  count: number,
  excludeCategories?: string[],
): WordWithCategory[] {
  let allWords = getWordsWithCategories();

  if (excludeCategories) {
    allWords = allWords.filter((w) => !excludeCategories.includes(w.category));
  }

  const shuffled = shuffleArray(allWords);
  return shuffled.slice(0, count);
}

// تولید صفحه بازی با توزیع رنگ‌ها
export function generateBoardWords(): {
  redWords: string[];
  blueWords: string[];
  neutralWords: string[];
  assassinWords: string[];
  allWordsWithColors: { word: string; color: string }[];
} {
  const allCategories = Object.keys(wordsData);
  const shuffledCategories = shuffleArray(allCategories);

  // توزیع دسته‌بندی‌ها بین رنگ‌ها
  const redCategories = shuffledCategories.slice(
    0,
    Math.ceil(shuffledCategories.length / 4),
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

  // انتخاب کلمات از هر دسته
  let redWords: WordWithCategory[] = [];
  let blueWords: WordWithCategory[] = [];
  let neutralWords: WordWithCategory[] = [];
  let assassinWords: WordWithCategory[] = [];

  // تیم قرمز (8 کلمه)
  for (const category of redCategories) {
    const needed = GAME_CONSTANTS.RED_WORDS_COUNT - redWords.length;
    if (needed <= 0) break;
    const words = getRandomWordsFromCategory(category, Math.min(needed, 3));
    redWords.push(...words);
  }
  if (redWords.length < GAME_CONSTANTS.RED_WORDS_COUNT) {
    const remaining = GAME_CONSTANTS.RED_WORDS_COUNT - redWords.length;
    const moreWords = getRandomUniqueWords(remaining, [
      ...redCategories,
      ...blueCategories,
      ...neutralCategories,
      ...assassinCategories,
    ]);
    redWords.push(...moreWords);
  }

  // تیم آبی (9 کلمه)
  for (const category of blueCategories) {
    const needed = GAME_CONSTANTS.BLUE_WORDS_COUNT - blueWords.length;
    if (needed <= 0) break;
    const words = getRandomWordsFromCategory(category, Math.min(needed, 3));
    blueWords.push(...words);
  }
  if (blueWords.length < GAME_CONSTANTS.BLUE_WORDS_COUNT) {
    const remaining = GAME_CONSTANTS.BLUE_WORDS_COUNT - blueWords.length;
    const moreWords = getRandomUniqueWords(remaining, [
      ...redCategories,
      ...blueCategories,
      ...neutralCategories,
      ...assassinCategories,
    ]);
    blueWords.push(...moreWords);
  }

  // کلمات خنثی (7 کلمه)
  for (const category of neutralCategories) {
    const needed = GAME_CONSTANTS.NEUTRAL_WORDS_COUNT - neutralWords.length;
    if (needed <= 0) break;
    const words = getRandomWordsFromCategory(category, Math.min(needed, 2));
    neutralWords.push(...words);
  }
  if (neutralWords.length < GAME_CONSTANTS.NEUTRAL_WORDS_COUNT) {
    const remaining = GAME_CONSTANTS.NEUTRAL_WORDS_COUNT - neutralWords.length;
    const moreWords = getRandomUniqueWords(remaining, [
      ...redCategories,
      ...blueCategories,
      ...neutralCategories,
      ...assassinCategories,
    ]);
    neutralWords.push(...moreWords);
  }

  // کلمات قاتل (1 کلمه)
  for (const category of assassinCategories) {
    if (assassinWords.length >= GAME_CONSTANTS.ASSASSIN_WORDS_COUNT) break;
    const words = getRandomWordsFromCategory(category, 1);
    assassinWords.push(...words);
  }
  if (assassinWords.length < GAME_CONSTANTS.ASSASSIN_WORDS_COUNT) {
    const moreWords = getRandomUniqueWords(
      GAME_CONSTANTS.ASSASSIN_WORDS_COUNT - assassinWords.length,
      [
        ...redCategories,
        ...blueCategories,
        ...neutralCategories,
        ...assassinCategories,
      ],
    );
    assassinWords.push(...moreWords);
  }

  // ساخت آرایه نهایی با رنگ‌ها
  const allWordsWithColors = [
    ...redWords
      .slice(0, GAME_CONSTANTS.RED_WORDS_COUNT)
      .map((w) => ({ word: w.word, color: "red" })),
    ...blueWords
      .slice(0, GAME_CONSTANTS.BLUE_WORDS_COUNT)
      .map((w) => ({ word: w.word, color: "blue" })),
    ...neutralWords
      .slice(0, GAME_CONSTANTS.NEUTRAL_WORDS_COUNT)
      .map((w) => ({ word: w.word, color: "neutral" })),
    ...assassinWords
      .slice(0, GAME_CONSTANTS.ASSASSIN_WORDS_COUNT)
      .map((w) => ({ word: w.word, color: "assassin" })),
  ];

  // شافل نهایی برای چینش تصادفی
  const shuffledFinal = shuffleArray(allWordsWithColors);

  return {
    redWords: redWords
      .slice(0, GAME_CONSTANTS.RED_WORDS_COUNT)
      .map((w) => w.word),
    blueWords: blueWords
      .slice(0, GAME_CONSTANTS.BLUE_WORDS_COUNT)
      .map((w) => w.word),
    neutralWords: neutralWords
      .slice(0, GAME_CONSTANTS.NEUTRAL_WORDS_COUNT)
      .map((w) => w.word),
    assassinWords: assassinWords
      .slice(0, GAME_CONSTANTS.ASSASSIN_WORDS_COUNT)
      .map((w) => w.word),
    allWordsWithColors: shuffledFinal,
  };
}

// دریافت یک کلمه تصادفی از یک دسته خاص (برای تست)
export function getRandomWordFromCategory(category: string): string | null {
  const categoryWords = wordsData[category];
  if (!categoryWords || categoryWords.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * categoryWords.length);
  return categoryWords[randomIndex];
}

// دریافت لیست تمام دسته‌بندی‌ها
export function getCategories(): string[] {
  return Object.keys(wordsData);
}

// دریافت آمار کلمات
export function getWordsStats(): {
  totalWords: number;
  categories: { name: string; count: number }[];
} {
  const categories = Object.entries(wordsData).map(([name, words]) => ({
    name,
    count: words.length,
  }));

  const totalWords = categories.reduce((acc, cat) => acc + cat.count, 0);

  return { totalWords, categories };
}

// برای استفاده در boardGenerator
export const WORDS_DB = wordsData;

// خروجی برای دیباگ
console.log("📊 Words stats:", getWordsStats());
