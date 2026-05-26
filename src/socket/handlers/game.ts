// backend/src/socket/handlers/game.ts
import { Socket, Server as SocketServer } from "socket.io";
import { roomStore } from "../../store/roomStore.js";
import { gameStateManager } from "../../game/GameStateManager.js";
import { sendRoomUpdate } from "./room/update.js";
import { getGameLogger } from "../../game/GameLogger.js";

export function handleGiveClue(
  io: SocketServer,
  socket: Socket,
  data: { code: string; userId: string; clue: string; number: number },
  callback?: any,
) {
  const { code, userId, clue, number } = data;
  const room = roomStore.get(code);

  if (!room || room.gameStatus !== "active") {
    callback?.({ success: false, error: "Game is not active" });
    return;
  }

  const result = gameStateManager.giveClue(code, userId, clue, number);
  callback?.(result);

  if (result.success) {
    const game = gameStateManager.getGame(code);
    if (game) {
      const logger = getGameLogger(code);
      const currentTurn = game.turnState.turn;
      const spymaster = room.players.get(userId);

      const logEntry = logger.clueGiven(
        spymaster?.name || userId,
        currentTurn,
        clue,
        number,
      );
      io.to(code).emit("game-log", { log: logEntry });

      io.to(code).emit("clue-given", {
        clue,
        number,
        turn: currentTurn,
        remainingOperatives: game.turnState.remainingOperatives,
      });
    }
  }
}

export function handleMakeGuess(
  io: SocketServer,
  socket: Socket,
  data: {
    code: string;
    userId: string;
    wordIndex: number;
  },
  callback?: any,
) {
  const { code, userId, wordIndex } = data;
  const room = roomStore.get(code);

  if (!room || room.gameStatus !== "active") {
    callback?.({ success: false, error: "Game is not active" });
    return;
  }

  // استفاده از makeGuess به جای castVote
  const result = gameStateManager.makeGuess(code, userId, wordIndex);

  callback?.(result);

  if (result.success && result.revealed) {
    // 🔥 دریافت game بعد از نتیجه
    const game = gameStateManager.getGame(code);
    if (!game) return;

    const logger = getGameLogger(code);
    const guesser = room.players.get(userId);

    // تعیین نوع نتیجه برای لاگ
    let resultLogger: "correct" | "wrong" | "assassin" = "wrong";

    if (result.revealed.color === "assassin") {
      resultLogger = "assassin";
    } else if (result.revealed.color === (result.newTurn ? "blue" : "red")) {
      // توجه: این منطق نیاز به بررسی دقیق‌تر دارد
      resultLogger =
        result.revealed.color === game.turnState.turn ? "correct" : "wrong";
    }

    // ارسال نتیجه باز شدن کارت به همه
    io.to(code).emit("word-revealed", {
      wordIndex,
      color: result.revealed.color,
      isGameOver: result.revealed.isGameOver,
      newTurn: result.newTurn,
      winner: result.winner,
    });

    // بررسی پایان بازی
    if (result.revealed.isGameOver || result.winner) {
      room.gameStatus = "finished";
      io.to(code).emit("game-over", {
        winner: result.winner,
        message:
          result.winner === "red"
            ? "🔴 تیم قرمز برنده شد!"
            : "🔵 تیم آبی برنده شد!",
      });
    } else if (result.newTurn) {
      io.to(code).emit("turn-changed", { turn: result.newTurn });
    }

    // ارسال وضعیت به‌روز شده
    io.to(code).emit("game-state-update", {
      words: game.words,
      turn: game.turnState.turn,
      remainingOperatives: game.turnState.remainingOperatives,
      currentClue: game.turnState.currentClue,
    });

    // اضافه کردن لاگ
    const logEntry = logger.guessMade(
      guesser?.name || userId,
      game.words[wordIndex].word,
      resultLogger,
    );
    io.to(code).emit("game-log", { log: logEntry });
  }
}

export function handleEndTurn(
  io: SocketServer,
  socket: Socket,
  data: { code: string; userId: string },
) {
  const { code } = data;
  const result = gameStateManager.endTurn(code);

  if (result.success && result.newTurn) {
    io.to(code).emit("turn-changed", { turn: result.newTurn });
    const logger = getGameLogger(code);
    const logEntry = logger.turnChanged(result.newTurn);
    io.to(code).emit("game-log", { log: logEntry });
  }
}

export function handleAssignRole(
  io: SocketServer,
  socket: Socket,
  data: {
    code: string;
    userId: string;
    team: "red" | "blue";
    role: "spymaster" | "operative";
  },
): void {
  const { code, userId, team, role } = data;
  const success = gameStateManager.assignRole(code, userId, team, role);

  if (success) {
    const room = roomStore.get(code);
    if (room && room.players.has(userId)) {
      const player = room.players.get(userId)!;
      player.team = team;
      player.role = role;
      sendRoomUpdate(io, code);
    }
  }
}
