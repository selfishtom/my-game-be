// backend/src/game/GameStateManager.ts
import {
  GameWord,
  generateBoard,
  revealWord,
  calculateRemainingWords,
} from "./boardGenerator.js";
import {
  GameTurnState,
  createInitialTurnState,
  validateClue,
  switchTurn,
  updateRemainingWords,
  checkWinner,
  declareWinner,
} from "./turnManager.js";
import {
  VoteSession,
  createVoteSession,
  castVote,
  endVoteSession,
  setVoteTimeout,
} from "./voteManager.js";

export interface GameSession {
  roomCode: string;
  words: GameWord[];
  turnState: GameTurnState;
  voteSession: VoteSession | null;
  isActive: boolean;
}

export class GameStateManager {
  private games: Map<string, GameSession> = new Map();

  // شروع بازی جدید
  startGame(roomCode: string): GameSession {
    const words = generateBoard();
    const turnState = createInitialTurnState(words);

    console.log(`🎮 Creating game session for room ${roomCode}`);
    console.log(`📊 Words count: ${words.length}`);
    console.log(`🎲 Initial turn: ${turnState.turn}`);

    const gameSession: GameSession = {
      roomCode,
      words,
      turnState,
      voteSession: null,
      isActive: true,
    };

    this.games.set(roomCode, gameSession);
    console.log(`✅ Game session created for room ${roomCode}`);
    return gameSession;
  }

  assignRole(
    roomCode: string,
    userId: string,
    team: "red" | "blue",
    role: "spymaster" | "guesser",
  ): boolean {
    const game = this.games.get(roomCode);
    if (!game) {
      console.log(`❌ Game not found for room ${roomCode}`);
      return false;
    }

    console.log(`🎭 Assigning role: user ${userId} -> ${team} ${role}`);

    if (role === "spymaster") {
      if (team === "red") {
        game.turnState.redTeam.spymaster = userId;
      } else {
        game.turnState.blueTeam.spymaster = userId;
      }
    } else {
      if (team === "red") {
        if (!game.turnState.redTeam.guessers.includes(userId)) {
          game.turnState.redTeam.guessers.push(userId);
        }
      } else {
        if (!game.turnState.blueTeam.guessers.includes(userId)) {
          game.turnState.blueTeam.guessers.push(userId);
        }
      }
    }

    console.log(
      `✅ Role assigned. Red team: spymaster=${game.turnState.redTeam.spymaster}, guessers=${game.turnState.redTeam.guessers.length}`,
    );
    console.log(
      `✅ Role assigned. Blue team: spymaster=${game.turnState.blueTeam.spymaster}, guessers=${game.turnState.blueTeam.guessers.length}`,
    );

    return true;
  }

  // دریافت جلسه بازی
  getGame(roomCode: string): GameSession | undefined {
    return this.games.get(roomCode);
  }

  // پایان بازی
  endGame(roomCode: string, winner: "red" | "blue" | null): void {
    const game = this.games.get(roomCode);
    if (game) {
      game.isActive = false;
      game.turnState.winner = winner;
      console.log(
        `🏆 Game ended for room ${roomCode}, winner: ${winner || "none"}`,
      );
    }
  }

  // حذف بازی
  removeGame(roomCode: string): void {
    this.games.delete(roomCode);
  }

  // گرفتن تیم قرمز
  getRedTeam(roomCode: string) {
    const game = this.games.get(roomCode);
    return game?.turnState.redTeam;
  }

  // گرفتن تیم آبی
  getBlueTeam(roomCode: string) {
    const game = this.games.get(roomCode);
    return game?.turnState.blueTeam;
  }

  // گرفتن نوبت فعلی
  getCurrentTurn(roomCode: string) {
    const game = this.games.get(roomCode);
    return game?.turnState.turn;
  }

  // دادن رمز توسط Spymaster
  giveClue(
    roomCode: string,
    userId: string,
    clue: string,
    number: number,
  ): { success: boolean; error?: string; remainingGuesses?: number } {
    const game = this.games.get(roomCode);
    if (!game || !game.isActive) {
      return { success: false, error: "Game not active" };
    }

    const currentTurn = game.turnState.turn;
    const isSpymaster =
      currentTurn === "red"
        ? game.turnState.redTeam.spymaster === userId
        : game.turnState.blueTeam.spymaster === userId;

    if (!isSpymaster) {
      return {
        success: false,
        error: "Not your turn or you are not the spymaster",
      };
    }

    const validation = validateClue(clue, number);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    // ذخیره سرنخ
    game.turnState.currentClue = {
      clue,
      number,
      giverId: userId,
    };
    game.turnState.remainingGuesses = number + 1;

    // ایجاد جلسه رأی‌گیری
    const guessers =
      currentTurn === "red"
        ? game.turnState.redTeam.guessers
        : game.turnState.blueTeam.guessers;

    game.voteSession = createVoteSession(
      roomCode,
      currentTurn,
      guessers,
      Date.now(),
    );

    return {
      success: true,
      remainingGuesses: game.turnState.remainingGuesses,
    };
  }

  // ثبت رأی برای حدس کلمه
  castVote(
    roomCode: string,
    userId: string,
    wordIndex: number,
  ): {
    success: boolean;
    error?: string;
    revealed?: { color: string; isGameOver: boolean };
    newTurn?: "red" | "blue";
    winner?: "red" | "blue" | null;
  } {
    const game = this.games.get(roomCode);
    if (!game || !game.isActive || !game.voteSession) {
      return { success: false, error: "No active voting session" };
    }

    const voteSession = game.voteSession;
    const currentTurn = voteSession.targetTeam;

    // بررسی اینکه کاربر جزو تیم حدس‌زننده هست
    const isGuesser =
      currentTurn === "red"
        ? game.turnState.redTeam.guessers.includes(userId)
        : game.turnState.blueTeam.guessers.includes(userId);

    if (!isGuesser) {
      return { success: false, error: "You are not a guesser for this team" };
    }

    // ثبت رأی
    const voteResult = castVote(voteSession, userId, wordIndex);
    if (!voteResult.success) {
      return { success: false, error: voteResult.error };
    }

    // اگر به آستانه نرسیده، فقط آرا را به‌روز می‌کنیم
    if (!voteResult.reachedThreshold || voteResult.selectedWord === undefined) {
      return { success: true };
    }

    // به آستانه رسیده - کارت نهایی انتخاب شده
    endVoteSession(voteSession);
    game.voteSession = null;

    // باز کردن کارت
    const revealResult = revealWord(game.words, voteResult.selectedWord);

    // به‌روزرسانی تعداد کلمات باقی‌مانده
    if (revealResult.color === "red") {
      const newRedTeam = updateRemainingWords(
        game.words,
        game.turnState.redTeam,
        "red",
      );
      game.turnState.redTeam = newRedTeam;
    } else if (revealResult.color === "blue") {
      const newBlueTeam = updateRemainingWords(
        game.words,
        game.turnState.blueTeam,
        "blue",
      );
      game.turnState.blueTeam = newBlueTeam;
    }

    // بررسی برنده شدن
    const redWinner = checkWinner(game.turnState.redTeam);
    const blueWinner = checkWinner(game.turnState.blueTeam);

    if (redWinner) {
      game.turnState.winner = "red";
      game.isActive = false;
      return {
        success: true,
        revealed: revealResult,
        winner: "red",
        isGameOver: true,
      };
    }

    if (blueWinner) {
      game.turnState.winner = "blue";
      game.isActive = false;
      return {
        success: true,
        revealed: revealResult,
        winner: "blue",
        isGameOver: true,
      };
    }

    // اگر قاتل بود
    if (revealResult.isGameOver) {
      const winner = currentTurn === "red" ? "blue" : "red";
      game.turnState.winner = winner;
      game.isActive = false;
      return {
        success: true,
        revealed: revealResult,
        winner,
        isGameOver: true,
      };
    }

    // مدیریت نوبت و حدس‌های باقی‌مانده
    let newTurn: "red" | "blue" | undefined;

    if (revealResult.color === currentTurn) {
      // درست حدس زد - یک حدس کم کن
      game.turnState.remainingGuesses--;

      if (game.turnState.remainingGuesses === 0) {
        // نوبت عوض بشه
        newTurn = switchTurn(currentTurn);
        game.turnState.turn = newTurn;
        game.turnState.currentClue = undefined;
        game.turnState.remainingGuesses = 0;
      } else {
        // هنوز حدس باقی مانده - دوباره رأی‌گیری
        const guessers =
          currentTurn === "red"
            ? game.turnState.redTeam.guessers
            : game.turnState.blueTeam.guessers;
        game.voteSession = createVoteSession(
          roomCode,
          currentTurn,
          guessers,
          Date.now(),
        );
      }
    } else {
      // اشتباه حدس زد - نوبت عوض بشه
      newTurn = switchTurn(currentTurn);
      game.turnState.turn = newTurn;
      game.turnState.currentClue = undefined;
      game.turnState.remainingGuesses = 0;
    }

    return {
      success: true,
      revealed: revealResult,
      newTurn,
      winner: game.turnState.winner,
    };
  }

  // تخصیص نقش به کاربر
  // assignRole(
  //   roomCode: string,
  //   userId: string,
  //   team: "red" | "blue",
  //   role: "spymaster" | "guesser",
  // ): boolean {
  //   const game = this.games.get(roomCode);
  //   if (!game) return false;

  //   if (role === "spymaster") {
  //     if (team === "red") {
  //       game.turnState.redTeam.spymaster = userId;
  //     } else {
  //       game.turnState.blueTeam.spymaster = userId;
  //     }
  //   } else {
  //     if (team === "red") {
  //       if (!game.turnState.redTeam.guessers.includes(userId)) {
  //         game.turnState.redTeam.guessers.push(userId);
  //       }
  //     } else {
  //       if (!game.turnState.blueTeam.guessers.includes(userId)) {
  //         game.turnState.blueTeam.guessers.push(userId);
  //       }
  //     }
  //   }

  //   return true;
  // }
}

// یک instance واحد برای کل برنامه
export const gameStateManager = new GameStateManager();
