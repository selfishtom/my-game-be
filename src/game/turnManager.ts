// backend/src/game/turnManager.ts
import {
  GameWord,
  calculateRemainingWords,
  getStartingTeam,
} from "./boardGenerator.js";

export interface TeamState {
  spymaster: string | null;
  operatives: string[];
  remainingWords: number;
}

export interface GameTurnState {
  turn: "red" | "blue";
  redTeam: TeamState;
  blueTeam: TeamState;
  currentClue?: {
    clue: string;
    number: number;
    giverId: string;
  };
  remainingOperatives: number;
  winner: "red" | "blue" | null;
}

// ایجاد وضعیت اولیه نوبت‌ها
export function createInitialTurnState(words: GameWord[]): GameTurnState {
  const redRemaining = calculateRemainingWords(words, "red");
  const blueRemaining = calculateRemainingWords(words, "blue");

  return {
    turn: getStartingTeam(),
    redTeam: {
      spymaster: null,
      operatives: [],
      remainingWords: redRemaining,
    },
    blueTeam: {
      spymaster: null,
      operatives: [],
      remainingWords: blueRemaining,
    },
    remainingOperatives: 0,
    winner: null,
  };
}

// بررسی آیا نوبت به پایان رسیده
export function isTurnOver(remainingOperatives: number): boolean {
  return remainingOperatives <= 0;
}

// تعویض نوبت
export function switchTurn(currentTurn: "red" | "blue"): "red" | "blue" {
  return currentTurn === "red" ? "blue" : "red";
}

// به‌روزرسانی تعداد کلمات باقی‌مانده
export function updateRemainingWords(
  words: GameWord[],
  teamState: TeamState,
  team: "red" | "blue",
): TeamState {
  const remaining = calculateRemainingWords(words, team);
  return {
    ...teamState,
    remainingWords: remaining,
  };
}

// اعتبارسنجی رمز (کلمه و عدد)
export function validateClue(
  clue: string,
  number: number,
): { isValid: boolean; error?: string } {
  if (!clue || clue.trim().length === 0) {
    return { isValid: false, error: "Clue cannot be empty" };
  }

  if (clue.length > 20) {
    return { isValid: false, error: "Clue is too long (max 20 characters)" };
  }

  if (number < 1 || number > 9) {
    return { isValid: false, error: "Number must be between 1 and 9" };
  }

  return { isValid: true };
}

// بررسی برنده شدن تیم
export function checkWinner(teamState: TeamState): boolean {
  return teamState.remainingWords === 0;
}

// اعلام برنده
export function declareWinner(
  turn: "red" | "blue",
  gameTurnState: GameTurnState,
): "red" | "blue" | null {
  if (gameTurnState.redTeam.remainingWords === 0) {
    return "red";
  }
  if (gameTurnState.blueTeam.remainingWords === 0) {
    return "blue";
  }
  return null;
}
