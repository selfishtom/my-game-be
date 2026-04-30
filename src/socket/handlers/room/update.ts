// backend/src/socket/handlers/room/update.ts
import { Server as SocketServer } from "socket.io";
import { roomStore } from "../../../store/roomStore.js";

export function sendRoomUpdate(io: SocketServer, code: string): void {
  const room = roomStore.get(code);
  if (!room) return;

  const playersList = Array.from(room.players.values()).map((p) => ({
    id: p.id,
    name: p.name,
    team: p.team,
    role: p.role,
    joinedAt: p.joinedAt,
  }));

  const spectatorsList = Array.from(room.spectators.values()).map((s) => ({
    id: s.id,
    name: s.name,
    joinedAt: s.joinedAt,
  }));

  io.to(code).emit("room-update", {
    code: room.code,
    creatorId: room.creatorId,
    players: playersList,
    spectators: spectatorsList,
    playerCount: playersList.length,
    spectatorCount: spectatorsList.length,
    gameStatus: room.gameStatus,
  });
}
