// backend/src/socket/handlers/room.ts
import { Socket, Server as SocketServer } from "socket.io";
import { roomStore } from "../../store/roomStore.js";
import { Player, Room } from "../types.js";
import { gameStateManager } from "../../game/GameStateManager.js";

export function handleJoinRoom(
  io: SocketServer,
  socket: Socket,
  data: {
    code: string;
    userId: string;
    playerName: string;
  },
): void {
  const { code, userId, playerName } = data;
  console.log(`📥 Join room request: ${code} from ${playerName} (${userId})`);

  let room: Room = roomStore.get(code)!;

  // اگر روم وجود نداشت، بساز
  if (!room) {
    room = {
      code,
      creatorId: userId,
      players: new Map(),
      spectators: new Map(),
      gameStatus: "waiting",
    };
    roomStore.set(code, room);
    console.log(`🏠 New room created: ${code} by ${playerName}`);
  }

  // اضافه کردن بازیکن
  if (!room.players.has(userId)) {
    const newPlayer: Player = {
      id: userId,
      name: playerName,
      team: null,
      role: null,
      socketId: socket.id,
      joinedAt: Date.now(),
    };
    room.players.set(userId, newPlayer);
    console.log(`👤 Player added: ${playerName}. Total: ${room.players.size}`);
  } else {
    // به‌روزرسانی socketId برای reconnect
    const player = room.players.get(userId)!;
    player.socketId = socket.id;
    console.log(`🔄 Player reconnected: ${playerName}`);
  }

  // ذخیره اطلاعات در socket
  (socket as any).userId = userId;
  (socket as any).roomCode = code;

  // پیوستن به روم Socket.io
  socket.join(code);

  // ارسال به‌روزرسانی به همه
  sendRoomUpdate(io, code);

  // اگر سازنده وارد شد و بازی شروع نشده، خودکار شروع کن
  if (
    room.creatorId === userId &&
    room.gameStatus === "waiting" &&
    room.players.size >= 2
  ) {
    console.log(
      `👑 Creator ${playerName} joined, automatically starting game...`,
    );
    startGameAutomatically(io, code);
  } else if (room.creatorId === userId && room.gameStatus === "waiting") {
    console.log(`👑 Creator ${playerName} joined, waiting for more players...`);
  }
}

export function handleLeaveRoom(
  io: SocketServer,
  socket: Socket,
  data: {
    code: string;
    userId: string;
  },
): void {
  const { code, userId } = data;
  const room = roomStore.get(code);

  if (room && room.players.has(userId)) {
    const player = room.players.get(userId)!;
    room.players.delete(userId);
    console.log(`👋 Player left: ${player.name} from room ${code}`);

    socket.leave(code);

    if (room.players.size === 0) {
      roomStore.delete(code);
      gameStateManager.removeGame(code);
      console.log(`🗑️ Room deleted (empty): ${code}`);
    } else {
      // اگر سازنده رفت، نفر اول جدید سازنده می‌شود
      if (room.creatorId === userId && room.players.size > 0) {
        const newCreator = Array.from(room.players.values())[0];
        room.creatorId = newCreator.id;
        console.log(`👑 New creator assigned: ${newCreator.name}`);
      }
      sendRoomUpdate(io, code);
    }
  }
}

export function startGameAutomatically(io: SocketServer, code: string): void {
  const room = roomStore.get(code);
  if (!room || room.gameStatus !== "waiting") return;

  console.log(`🚀 Automatically starting game in room: ${code}`);

  // شروع بازی
  room.gameStatus = "active";

  // ایجاد جلسه بازی
  const gameSession = gameStateManager.startGame(code);

  const players = Array.from(room.players.values());
  console.log(`👥 Players in room: ${players.map((p) => p.name).join(", ")}`);

  if (players.length >= 2) {
    // تصادفی کردن ترتیب بازیکنان
    const shuffledPlayers = [...players];
    for (let i = shuffledPlayers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledPlayers[i], shuffledPlayers[j]] = [
        shuffledPlayers[j],
        shuffledPlayers[i],
      ];
    }

    // اختصاص Spymaster برای تیم قرمز
    const redSpymaster = shuffledPlayers[0];
    gameStateManager.assignRole(code, redSpymaster.id, "red", "spymaster");
    console.log(`🔴 Red Spymaster: ${redSpymaster.name}`);

    // اختصاص Spymaster برای تیم آبی
    const blueSpymaster = shuffledPlayers[1];
    gameStateManager.assignRole(code, blueSpymaster.id, "blue", "spymaster");
    console.log(`🔵 Blue Spymaster: ${blueSpymaster.name}`);

    // بقیه بازیکنان به عنوان حدس‌زن
    for (let i = 2; i < shuffledPlayers.length; i++) {
      const player = shuffledPlayers[i];
      const team = i % 2 === 0 ? "red" : "blue";
      gameStateManager.assignRole(code, player.id, team, "guesser");
      console.log(
        `👤 ${player.name} -> ${team === "red" ? "🔴 Red Guesser" : "🔵 Blue Guesser"}`,
      );
    }

    // به‌روزرسانی نقش‌ها در roomStore
    for (const player of players) {
      const game = gameStateManager.getGame(code);
      if (game) {
        if (game.turnState.redTeam.spymaster === player.id) {
          player.role = "spymaster";
          player.team = "red";
        } else if (game.turnState.blueTeam.spymaster === player.id) {
          player.role = "spymaster";
          player.team = "blue";
        } else if (game.turnState.redTeam.guessers.includes(player.id)) {
          player.role = "guesser";
          player.team = "red";
        } else if (game.turnState.blueTeam.guessers.includes(player.id)) {
          player.role = "guesser";
          player.team = "blue";
        }
      }
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

export function sendRoomUpdate(io: SocketServer, code: string): void {
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
