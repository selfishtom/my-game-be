// backend/src/game/GameLogger.ts
import type { GameLogEntry } from "../socket/types.js";

export class GameLogger {
  private logs: GameLogEntry[] = [];
  private maxLogs: number = 100; // حداکثر تعداد لاگ‌ها

  constructor(private roomCode: string) {}

  // اضافه کردن لاگ جدید
  private addLog(
    type: GameLogEntry["type"],
    message: string,
    details?: any,
  ): GameLogEntry {
    const entry: GameLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      timestamp: Date.now(),
      type,
      message,
      details,
    };

    this.logs.push(entry);

    // اگر تعداد لاگ‌ها از حد مجاز بیشتر شد، قدیمی‌ترین را حذف کن
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    console.log(`[LOG][${this.roomCode}] ${message}`);
    return entry;
  }

  // دریافت همه لاگ‌ها
  getLogs(): GameLogEntry[] {
    return [...this.logs];
  }

  // پاک کردن لاگ‌ها
  clearLogs(): void {
    this.logs = [];
  }

  // ========== رویدادهای خاص بازی ==========

  // بازیکن به روم پیوست
  playerJoined(playerName: string): GameLogEntry {
    return this.addLog("info", `👤 ${playerName} Joined To room.`);
  }

  // بازیکن از روم خارج شد
  playerLeft(playerName: string): GameLogEntry {
    return this.addLog("warning", `👤 ${playerName} Exit From room.`);
  }

  // انتخاب تیم و نقش
  roleAssigned(
    playerName: string,
    team: "red" | "blue",
    role: "spymaster" | "operative",
  ): GameLogEntry {
    const teamName = team === "red" ? "red" : "blue";
    const roleName = role === "spymaster" ? "spymaster" : "operative";
    return this.addLog(
      "info",
      `🎭 ${playerName} assigned to ${roleName} team ${teamName} joined.`,
    );
  }

  // شروع بازی
  gameStarted(startingTeam: "red" | "blue"): GameLogEntry {
    const teamName = startingTeam === "red" ? "red" : "blue";
    return this.addLog("success", `🎮 game started - turn: team ${teamName}`);
  }

  // دادن رمز
  clueGiven(
    spymasterName: string,
    team: "red" | "blue",
    clue: string,
    number: number,
  ): GameLogEntry {
    const teamName = team === "red" ? "red" : "blue";
    return this.addLog(
      "clue",
      `💡 spymaster team ${teamName} clue "${clue} ${number}" sent it.`,
    );
  }

  // حدس زدن
  guessMade(
    operativeName: string,
    word: string,
    result: "correct" | "wrong" | "assassin",
  ): GameLogEntry {
    let emoji = "";
    let resultText = "";
    let type: GameLogEntry["type"] = "guess";

    switch (result) {
      case "correct":
        emoji = "✅";
        resultText = "درست";
        type = "success";
        break;
      case "wrong":
        emoji = "❌";
        resultText = "اشتباه";
        type = "error";
        break;
      case "assassin":
        emoji = "💀";
        resultText = "قاتل ها ها";
        type = "error";
        break;
    }

    return this.addLog(
      type,
      `${emoji} ${operativeName} کلمه "${word}" انتخاب کرده → نتیجه ${resultText}`,
    );
  }

  // تغییر نوبت
  turnChanged(
    team: "red" | "blue",
    remainingOperatives?: number,
  ): GameLogEntry {
    const teamName = team === "red" ? "red" : "blue";
    let message = `🔄 Turn to the team ${teamName} changed.`;
    if (remainingOperatives !== undefined) {
      message += ` (${remainingOperatives} Remaining guess)`;
    }
    return this.addLog("turn", message);
  }

  // پایان بازی
  gameOver(
    winner: "red" | "blue" | null,
    isAssassinLoss?: boolean,
  ): GameLogEntry {
    if (winner === "red") {
      return this.addLog("winner", `🏆 The red team won!`);
    } else if (winner === "blue") {
      return this.addLog("winner", `🏆 The blue team won!`);
    } else {
      return this.addLog("warning", `🎮 Game over!`);
    }
  }

  // کارت قاتل باز شد
  assassinRevealed(loserTeam: "red" | "blue"): GameLogEntry {
    const teamName = loserTeam === "red" ? "red" : "blue";
    return this.addLog(
      "error",
      `💀 The killer card has been revealed! Team ${teamName} loss`,
    );
  }

  // پیام عمومی
  info(message: string): GameLogEntry {
    return this.addLog("info", message);
  }

  error(message: string): GameLogEntry {
    return this.addLog("error", message);
  }
}

// ذخیره loggerها برای هر روم
const loggers = new Map<string, GameLogger>();

export function getGameLogger(roomCode: string): GameLogger {
  if (!loggers.has(roomCode)) {
    loggers.set(roomCode, new GameLogger(roomCode));
  }
  return loggers.get(roomCode)!;
}

export function removeGameLogger(roomCode: string): void {
  loggers.delete(roomCode);
}
