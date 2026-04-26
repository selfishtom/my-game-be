import { Server as SocketServer } from "socket.io";
import { roomStore } from "../../../store/roomStore.js";

export function sendRoomUpdate(io: SocketServer, code: string): void {
  const room = roomStore.get(code);
  if (!room) return;

  const playersList = Array.from(room.players.values()).map((p) => ({
    id: p.id,
    name: p.name,
    isReady: p.isReady,
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
