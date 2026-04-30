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
  data: { code: string; userId: string; wordIndex: number },
  callback?: (response: {
    success: boolean;
    error?: string;
    revealed?: { color: string; isGameOver: boolean };
    newTurn?: "red" | "blue";
    winner?: "red" | "blue" | null;
  }) => void,
): void {
  console.log("🔨 handleMakeGuess called:", data);
  const { code, userId, wordIndex } = data;
  const room = roomStore.get(code);

  if (!room || room.gameStatus !== "active") {
    if (callback) callback({ success: false, error: "Game is not active" });
    else socket.emit("error", { error: "Game is not active" });
    return;
  }

  const result = gameStateManager.castVote(code, userId, wordIndex);

  if (callback) {
    callback(result);
  } else if (!result.success) {
    socket.emit("error", { error: result.error });
  }

  if (result.success && result.revealed) {
    // ارسال نتیجه باز شدن کارت به همه
    io.to(code).emit("word-revealed", {
      wordIndex,
      color: result.revealed.color,
      isGameOver: result.revealed.isGameOver,
      newTurn: result.newTurn,
      winner: result.winner,
    });

    // 🔥 اگر نوبت عوض شده، یک رویداد جداگانه برای پاک کردن clue بفرست
    if (result.newTurn) {
      io.to(code).emit("turn-changed", { turn: result.newTurn });
    }

    // ==========================================
    // 🔥 بررسی پایان بازی و ارسال اطلاعیه
    // ==========================================
    if (result.revealed.isGameOver || result.winner) {
      room.gameStatus = "finished";

      let message = "";
      let winnerName = "";

      if (result.winner === "red") {
        winnerName = "🔴 تیم قرمز";
        message = "🎉 تیم قرمز بازی را برد!";
      } else if (result.winner === "blue") {
        winnerName = "🔵 تیم آبی";
        message = "🎉 تیم آبی بازی را برد!";
      } else if (result.revealed.color === "assassin") {
        const currentTurn = result.newTurn === "red" ? "blue" : "red";
        winnerName = currentTurn === "red" ? "🔴 تیم قرمز" : "🔵 تیم آبی";
        message = `💀 کارت قاتل باز شد! ${winnerName} برنده شد!`;
      } else {
        message = "🎮 بازی تمام شد!";
      }

      console.log(`🏆 Game over in room ${code}: ${message}`);

      io.to(code).emit("game-over", {
        winner:
          result.winner ||
          (result.revealed.color === "assassin"
            ? room.creatorId === userId
              ? "blue"
              : "red"
            : null),
        message,
        isAssassinLoss: result.revealed.color === "assassin",
      });

      sendRoomUpdate(io, code);
    } else {
      // بازی ادامه دارد - ارسال وضعیت به‌روز شده
      const game = gameStateManager.getGame(code);
      if (game) {
        io.to(code).emit("game-state-update", {
          words: game.words,
          turn: game.turnState.turn,
          remainingOperatives: game.turnState.remainingOperatives,
          currentClue: game.turnState.currentClue,
          redTeam: game.turnState.redTeam,
          blueTeam: game.turnState.blueTeam,
        });
      }
    }
  }
}

export function handleEndTurn(
  io: SocketServer,
  socket: Socket,
  data: {
    code: string;
    userId: string;
  },
): void {
  const { code, userId } = data;
  const room = roomStore.get(code);

  if (!room || room.gameStatus !== "active") return;

  const game = gameStateManager.getGame(code);
  if (
    game &&
    game.turnState.turn ===
      (game.turnState.redTeam.spymaster === userId
        ? "red"
        : game.turnState.blueTeam.spymaster === userId
          ? "blue"
          : null)
  ) {
    const newTurn = game.turnState.turn === "red" ? "blue" : "red";
    game.turnState.turn = newTurn;
    game.turnState.currentClue = undefined;
    game.turnState.remainingOperatives = 0;

    io.to(code).emit("turn-changed", { turn: newTurn });
    io.to(code).emit("game-state-update", {
      turn: newTurn,
      currentClue: undefined,
      remainingOperatives: 0,
    });
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

// تابع کمکی برای ارسال آپدیت روم
// function sendRoomUpdate(io: SocketServer, code: string): void {
//   const room = roomStore.get(code);
//   if (!room) return;

//   const playersList = Array.from(room.players.values()).map((p) => ({
//     id: p.id,
//     name: p.name,
//     team: p.team,
//     role: p.role,
//   }));

//   const spectatorsList = Array.from(room.spectators.values()).map((s) => ({
//     id: s.id,
//     name: s.name,
//   }));

//   io.to(code).emit("room-update", {
//     code: room.code,
//     creatorId: room.creatorId,
//     players: playersList,
//     spectators: spectatorsList,
//     playerCount: playersList.length,
//     spectatorCount: spectatorsList.length,
//     gameStatus: room.gameStatus,
//   });
// }
