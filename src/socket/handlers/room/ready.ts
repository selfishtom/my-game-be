import { Socket, Server as SocketServer } from "socket.io";
import { roomStore } from "../../../store/roomStore.js";
import { sendRoomUpdate } from "./update.js";
import { startGameAutomatically } from "./start.js";

export function handlePlayerReady(
  io: SocketServer,
  socket: Socket,
  data: {
    code: string;
    userId: string;
    isReady: boolean;
  },
): void {
  const { code, userId, isReady } = data;
  const room = roomStore.get(code);

  if (room && room.players.has(userId)) {
    const player = room.players.get(userId)!;
    player.isReady = isReady;
    console.log(`✅ Player ready: ${player.name} = ${isReady}`);
    sendRoomUpdate(io, code);

    const allReady = Array.from(room.players.values()).every((p) => p.isReady);
    if (allReady && room.gameStatus === "waiting" && room.players.size >= 2) {
      console.log(`🎯 All players ready, automatically starting game...`);
      startGameAutomatically(io, code);
    }
  }
}
