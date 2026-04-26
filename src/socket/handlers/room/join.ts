// backend/src/socket/handlers/room/join.ts
import { Socket, Server as SocketServer } from "socket.io";
import { roomStore } from "../../../store/roomStore.js";
import { Player } from "../../types.js";
import { sendRoomUpdate } from "./update.js";

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

  if (!room) {
    room = {
      code,
      creatorId: userId,
      players: new Map(),
      gameStatus: "waiting",
    };
    roomStore.set(code, room);
    console.log(`🏠 New room created: ${code} by ${playerName}`);
  }

  if (!room.players.has(userId)) {
    // 🔥 مهم: همه بازیکنان جدید به صورت Spectator加入 می‌شوند (team و role null هستند)
    const newPlayer: Player = {
      id: userId,
      name: playerName,
      team: null, // Spectator
      role: null, // Spectator
      socketId: socket.id,
      isReady: false,
    };
    room.players.set(userId, newPlayer);
    console.log(
      `👤 Spectator added: ${playerName}. Total: ${room.players.size}`,
    );
  } else {
    const player = room.players.get(userId)!;
    player.socketId = socket.id;
    console.log(`🔄 Spectator reconnected: ${playerName}`);
  }

  (socket as any).userId = userId;
  (socket as any).roomCode = code;
  socket.join(code);

  sendRoomUpdate(io, code);
}
