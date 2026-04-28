// backend/src/socket/handlers/game.ts
import { Socket, Server as SocketServer } from "socket.io";
import { roomStore } from "../../store/roomStore.js";
import { gameStateManager } from "../../game/GameStateManager.js";

export function handleGiveClue(
  io: SocketServer,
  socket: Socket,
  data: {
    code: string;
    userId: string;
    clue: string;
    number: number;
  },
  callback: (response: { success: boolean; error?: string }) => void,
): void {
  const { code, userId, clue, number } = data;
  const room = roomStore.get(code);

  if (!room || room.gameStatus !== "active") {
    if (callback) callback({ success: false, error: "Game is not active" });
    else socket.emit("error", { error: "Game is not acitve" });
    return;
  }

  const result = gameStateManager.giveClue(code, userId, clue, number);

  if (callback) {
    callback({ success: result.success, error: result.error });
  } else if (!result.success) {
    socket.emit("error", { error: result.error });
  }

  if (result.success) {
    // ارسال سرنخ به همه اعضای تیم (نه به تیم مقابل)
    const game = gameStateManager.getGame(code);
    if (game) {
      io.to(code).emit("clue-given", {
        clue,
        number,
        turn: game.turnState.turn,
        remainingGuesses: game.turnState.remainingGuesses,
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
  callback: (response: {
    success: boolean;
    error?: string;
    revealed?: { color: string; isGameOver: boolean };
    newTurn?: "red" | "blue";
    winner?: "red" | "blue" | null;
  }) => void,
): void {
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
    // ارسال نتیجه به همه اعضای روم
    io.to(code).emit("word-revealed", {
      wordIndex,
      color: result.revealed.color,
      isGameOver: result.revealed.isGameOver,
      newTurn: result.newTurn,
      winner: result.winner,
    });

    // اگر بازی تمام شده
    if (result.revealed.isGameOver || result.winner) {
      room.gameStatus = "finished";
      sendGameOver(
        io,
        code,
        result.winner ||
          (result.revealed.color === "assassin"
            ? room.creatorId === userId
              ? "blue"
              : "red"
            : null),
      );
    } else {
      // ارسال وضعیت به‌روز شده بازی
      const game = gameStateManager.getGame(code);
      if (game) {
        io.to(code).emit("game-state-update", {
          words: game.words,
          turn: game.turnState.turn,
          remainingGuesses: game.turnState.remainingGuesses,
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
    // تعویض نوبت
    const newTurn = game.turnState.turn === "red" ? "blue" : "red";
    game.turnState.turn = newTurn;
    game.turnState.currentClue = undefined;
    game.turnState.remainingGuesses = 0;

    io.to(code).emit("turn-changed", { turn: newTurn });
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

function sendGameOver(
  io: SocketServer,
  code: string,
  winner: "red" | "blue" | null,
): void {
  io.to(code).emit("game-over", { winner });
  console.log(`🏆 Game over in room ${code}, winner: ${winner || "none"}`);
}

function sendRoomUpdate(io: SocketServer, code: string): void {
  const room = roomStore.get(code);
  if (!room) return;

  const playersList = Array.from(room.players.values()).map((p) => ({
    id: p.id,
    name: p.name,
    team: p.team,
    role: p.role,
  }));

  io.to(code).emit("room-update", {
    code: room.code,
    creatorId: room.creatorId,
    players: playersList,
    playerCount: playersList.length,
    gameStatus: room.gameStatus,
  });
}
