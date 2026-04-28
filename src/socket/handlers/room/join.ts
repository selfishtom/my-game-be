// backend/src/socket/handlers/room/join.ts
import { Socket, Server as SocketServer } from "socket.io";
import { roomStore } from "../../../store/roomStore.js";
import { sendRoomUpdate } from "./update.js";
import { startGameAutomatically, sendCurrentGameState } from "./start.js";

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

  let room = roomStore.get(code);
  const isNewRoom = !room;

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

  // 🔥 ابتدا به روم بپیوند (قبل از هر چیزی)
  socket.join(code);
  (socket as any).userId = userId;
  (socket as any).roomCode = code;

  // اضافه کردن بازیکن به Spectator
  if (!room.spectators.has(userId) && !room.players.has(userId)) {
    room.spectators.set(userId, {
      id: userId,
      name: playerName,
      socketId: socket.id,
      joinedAt: Date.now(),
    });
    console.log(
      `👁️ Spectator added: ${playerName}. Total spectators: ${room.spectators.size}`,
    );
  } else {
    // به‌روزرسانی socketId برای reconnect
    const existingSpectator = room.spectators.get(userId);
    if (existingSpectator) {
      existingSpectator.socketId = socket.id;
      console.log(`🔄 Spectator reconnected: ${playerName}`);
    }
    const existingPlayer = room.players.get(userId);
    if (existingPlayer) {
      existingPlayer.socketId = socket.id;
      console.log(`🔄 Player reconnected: ${playerName}`);
    }
  }

  sendRoomUpdate(io, code);

  if (room.gameStatus === "active") {
    sendCurrentGameState(io, code, socket.id);
  }

  // 🔥 شروع بازی فقط برای روم جدید (و نه برای reconnect)
  if (isNewRoom) {
    startGameAutomatically(io, code);
  }
}
