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
} from "./turnManager.js";

export interface GameSession {
  roomCode: string;
  words: GameWord[];
  turnState: GameTurnState;
  isActive: boolean;
}

export class GameStateManager {
  private games: Map<string, GameSession> = new Map();

  startGame(roomCode: string): GameSession {
    const words = generateBoard();
    const turnState = createInitialTurnState(words);

    const gameSession: GameSession = {
      roomCode,
      words,
      turnState,
      isActive: true,
    };

    this.games.set(roomCode, gameSession);
    console.log(`🎮 Game started for room ${roomCode}`);
    return gameSession;
  }

  getGame(roomCode: string): GameSession | undefined {
    return this.games.get(roomCode);
  }

  removeGame(roomCode: string): void {
    this.games.delete(roomCode);
  }

  // دادن رمز توسط Spymaster
  giveClue(
    roomCode: string,
    userId: string,
    clue: string,
    number: number,
  ): { success: boolean; error?: string; remainingOperatives?: number } {
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
    game.turnState.remainingOperatives = number + 1;

    console.log(
      `💡 Clue given: "${clue} ${number}" by ${userId}, remaining operatives: ${game.turnState.remainingOperatives}`,
    );

    return {
      success: true,
      remainingOperatives: game.turnState.remainingOperatives,
    };
  }

  // حدس زدن توسط operative (بدون رأی‌گیری)
  makeGuess(
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
    if (!game || !game.isActive) {
      return { success: false, error: "Game not active" };
    }

    const currentTurn = game.turnState.turn;

    // بررسی اینکه کاربر در تیم فعلی و operative است
    const isOperative =
      currentTurn === "red"
        ? game.turnState.redTeam.operatives.includes(userId)
        : game.turnState.blueTeam.operatives.includes(userId);

    if (!isOperative) {
      return {
        success: false,
        error: "Only operatives can guess during their turn",
      };
    }

    // بررسی اینکه clue داده شده باشد
    if (!game.turnState.currentClue) {
      return { success: false, error: "No clue has been given yet" };
    }

    // بررسی اینکه حدس باقی مانده باشد
    if (game.turnState.remainingOperatives <= 0) {
      return { success: false, error: "No guesses left" };
    }

    // باز کردن کارت
    const revealResult = revealWord(game.words, wordIndex);

    // کم کردن یک حدس
    game.turnState.remainingOperatives--;

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

    console.log(
      `🔨 Guess: user ${userId} guessed word ${wordIndex}, result: ${revealResult.color}, remaining guesses: ${game.turnState.remainingOperatives}`,
    );

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
      };
    }

    if (blueWinner) {
      game.turnState.winner = "blue";
      game.isActive = false;
      return {
        success: true,
        revealed: revealResult,
        winner: "blue",
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
      };
    }

    let newTurn: "red" | "blue" | undefined;

    if (revealResult.color === currentTurn) {
      // درست حدس زد
      if (game.turnState.remainingOperatives === 0) {
        // حدس‌ها تمام شد، نوبت عوض بشه
        newTurn = switchTurn(currentTurn);
        game.turnState.turn = newTurn;
        game.turnState.currentClue = undefined;
        game.turnState.remainingOperatives = 0;
      }
      // اگر حدس باقی دارد، همان تیم继续 حدس می‌زند
    } else {
      // اشتباه حدس زد - نوبت عوض بشه
      newTurn = switchTurn(currentTurn);
      game.turnState.turn = newTurn;
      game.turnState.currentClue = undefined;
      game.turnState.remainingOperatives = 0;
    }

    return {
      success: true,
      revealed: revealResult,
      newTurn,
      winner: game.turnState.winner,
    };
  }

  assignRole(
    roomCode: string,
    userId: string,
    team: "red" | "blue",
    role: "spymaster" | "operative",
  ): boolean {
    const game = this.games.get(roomCode);
    if (!game) return false;

    if (role === "spymaster") {
      if (team === "red") {
        game.turnState.redTeam.spymaster = userId;
      } else {
        game.turnState.blueTeam.spymaster = userId;
      }
    } else {
      if (team === "red") {
        if (!game.turnState.redTeam.operatives.includes(userId)) {
          game.turnState.redTeam.operatives.push(userId);
        }
      } else {
        if (!game.turnState.blueTeam.operatives.includes(userId)) {
          game.turnState.blueTeam.operatives.push(userId);
        }
      }
    }

    console.log(`🎭 Role assigned: ${userId} -> ${team} ${role}`);
    return true;
  }

  endTurn(roomCode: string): { success: boolean; newTurn?: "red" | "blue" } {
    const game = this.games.get(roomCode);
    if (!game || !game.isActive) {
      return { success: false };
    }

    const newTurn = switchTurn(game.turnState.turn);
    game.turnState.turn = newTurn;
    game.turnState.currentClue = undefined;
    game.turnState.remainingOperatives = 0;

    return { success: true, newTurn };
  }
}

export const gameStateManager = new GameStateManager();
