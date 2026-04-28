import { Socket, Server as SocketServer } from "socket.io";
import { roomStore } from "../../../store/roomStore.js";
import { gameStateManager } from "../../../game/GameStateManager.js";
import { sendRoomUpdate } from "./update.js";

// prettier-ignore
export function handleKickUser(io: SocketServer,socket: Socket,data:{code:string;userId:string;targetUserId:string;}):void 
{
  const { code, userId, targetUserId } = data;
  const room = roomStore.get(code);

  if (room && room.creatorId === userId) {
    const targetPlayer = room.players.get(targetUserId);
    if (targetPlayer) {
      room.players.delete(targetUserId);
      io.to(targetPlayer.socketId).emit("kicked-from-room");
      sendRoomUpdate(io, code);
    }
  }
}

// prettier-ignore
export function handleLeaveRoom(io: SocketServer, socket: Socket,
  data:{ code: string; userId: string;}): void {
  const { code, userId } = data;
  const room = roomStore.get(code);

  if (room && room.players.has(userId) || room?.spectators.has(userId)) {
    const player = room.players.get(userId)!;
    const spectator = room.spectators.get(userId);
    const userName = player?.name || spectator?.name || userId;

    // حذف از players یا spectators
    if (player) {
      room.players.delete(userId);
      console.log(`👋 Player left: ${userName} from room ${code}`);
    }
    if (spectator) {
      room.spectators.delete(userId);
      console.log(`👁️ Spectator left: ${userName} from room ${code}`);
    }

    socket.leave(code);

    // 🔥 بررسی: اگر روم کاملاً خالی شد، آن را حذف کن
    if (room.players.size === 0 && room.spectators.size === 0) {
      roomStore.delete(code);
      gameStateManager.removeGame(code);
      console.log(`🗑️ Room deleted (empty): ${code}`);
    } else {
      if (room.creatorId === userId && room.players.size > 0) {
        const playersList = Array.from(room.players.values());
        const oldestPlayer = playersList.reduce((oldest, current) => 
        {
          return (current.joinedAt || 0) < (oldest.joinedAt || 0) ? current : oldest;
        }, playersList[0]);

        room.creatorId = oldestPlayer.id;
        console.log(`👑 New creator assigned (by join order): ${oldestPlayer.name}`);
      }
      sendRoomUpdate(io, code);
    }
  }
}

// prettier-ignore
export function handleRestartGame(io:SocketServer,socket:Socket,data:{code:string;userId:string;}):void
{
  const { code, userId } = data;
  const room = roomStore.get(code);
  if (room && room.creatorId === userId) {
    room.gameStatus = "waiting";
    for (const player of room.players.values()) {
      player.team = null;
      player.role = null;
    }
    gameStateManager.removeGame(code);
    sendRoomUpdate(io, code);
    io.to(code).emit("game-restarted");
  }
}

// prettier-ignore
export function handleEndGame(io:SocketServer,socket:Socket,data:{code:string;userId:string;}):void
{
  const { code, userId } = data;
  const room = roomStore.get(code);
  if (room && room.creatorId === userId) {
    room.gameStatus = "finished";
    gameStateManager.endGame(code, null);
    sendRoomUpdate(io, code);
    io.to(code).emit("game-over", { winner: null });
  }
}
