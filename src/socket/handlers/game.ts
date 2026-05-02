// backend/src/socket/handlers/game.ts
import { Socket, Server as SocketServer } from "socket.io";
import { roomStore } from "../../store/roomStore.js";
import { gameStateManager } from "../../game/GameStateManager.js";
import { sendRoomUpdate } from "./room/update.js";

export function handleGiveClue(
  io: SocketServer,
  socket: Socket,
  data: {
    code: string;
    userId: string;
    clue: string;
    number: number;
  },
  callback?: (response: { success: boolean; error?: string }) => void,
): void {
  const { code, userId, clue, number } = data;
  const room = roomStore.get(code);

  if (!room || room.gameStatus !== "active") {
    if (callback) callback({ success: false, error: "Game is not active" });
    else socket.emit("error", { error: "Game is not active" });
    return;
  }

  const result = gameStateManager.giveClue(code, userId, clue, number);

  if (callback) {
    callback({ success: result.success, error: result.error });
  } else if (!result.success) {
    socket.emit("error", { error: result.error });
  }

  if (result.success) {
    const game = gameStateManager.getGame(code);
    if (game) {
      io.to(code).emit("clue-given", {
        clue,
        number,
        turn: game.turnState.turn,
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
    io.to(code).emit("word-revealed", {
      wordIndex,
      color: result.revealed.color,
      isGameOver: result.revealed.isGameOver,
      newTurn: result.newTurn,
      winner: result.winner,
    });

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
    const game = gameStateManager.getGame(code);
    if (game) {
      io.to(code).emit("game-state-update", {
        words: game.words,
        turn: game.turnState.turn,
        remainingOperatives: game.turnState.remainingOperatives,
        currentClue: game.turnState.currentClue,
      });
    }
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
