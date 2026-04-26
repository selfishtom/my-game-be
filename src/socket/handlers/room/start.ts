// backend/src/socket/handlers/room/start.ts
import { Socket, Server as SocketServer } from "socket.io";
import { roomStore } from "../../../store/roomStore.js";
import { gameStateManager } from "../../../game/GameStateManager.js";
import { sendRoomUpdate } from "./update.js";

// بررسی آمادگی برای شروع بازی
function isReadyToStart(room: any): boolean {
  const players = Array.from(room.players.values());

  // شرط: هر تیم حداقل یک Spymaster و یک Guesser داشته باشد
  const redSpymaster = players.find(
    (p) => p.team === "red" && p.role === "spymaster",
  );
  const redGuesser = players.find(
    (p) => p.team === "red" && p.role === "guesser",
  );
  const blueSpymaster = players.find(
    (p) => p.team === "blue" && p.role === "spymaster",
  );
  const blueGuesser = players.find(
    (p) => p.team === "blue" && p.role === "guesser",
  );

  const isReady = !!(
    redSpymaster &&
    redGuesser &&
    blueSpymaster &&
    blueGuesser
  );

  if (!isReady) {
    console.log(`⚠️ Game not ready for room ${room.code}:`, {
      redSpymaster: !!redSpymaster,
      redGuesser: !!redGuesser,
      blueSpymaster: !!blueSpymaster,
      blueGuesser: !!blueGuesser,
    });
  }

  return isReady;
}

// شروع خودکار بازی (توسط سازنده یا پس از آماده شدن همه)
export function startGameAutomatically(io: SocketServer, code: string): void {
  const room = roomStore.get(code);
  if (!room || room.gameStatus !== "waiting") return;

  if (!isReadyToStart(room)) {
    io.to(code).emit(
      "error",
      "برای شروع بازی هر تیم باید حداقل یک Spymaster و یک Guesser داشته باشد",
    );
    return;
  }

  console.log(`🚀 Starting game in room: ${code}`);
  room.gameStatus = "active";

  // ایجاد جلسه بازی
  const gameSession = gameStateManager.startGame(code);

  // انتقال نقش‌ها از roomStore به gameStateManager
  for (const player of room.players.values()) {
    if (player.team && player.role) {
      gameStateManager.assignRole(code, player.id, player.team, player.role);
      console.log(
        `📋 Transferred role: ${player.name} -> ${player.team} ${player.role}`,
      );
    }
  }

  sendRoomUpdate(io, code);

  // ارسال وضعیت بازی به همه اعضای روم
  io.to(code).emit("game-started", {
    words: gameSession.words,
    turn: gameSession.turnState.turn,
    remainingGuesses: gameSession.turnState.remainingGuesses,
  });

  console.log(
    `✅ Game started in room ${code}, turn: ${gameSession.turnState.turn}`,
  );
}

// شروع بازی توسط سازنده (دستی)
export function handleStartGame(
  io: SocketServer,
  socket: Socket,
  data: {
    code: string;
    userId: string;
  },
): void {
  const { code, userId } = data;
  const room = roomStore.get(code);

  if (room && room.creatorId === userId && room.gameStatus === "waiting") {
    startGameAutomatically(io, code);
  } else if (room && room.creatorId !== userId) {
    socket.emit("error", "فقط سازنده روم می‌تواند بازی را شروع کند");
  }
}
