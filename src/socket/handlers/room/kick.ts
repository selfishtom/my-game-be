import { Socket, Server as SocketServer } from "socket.io";
import { roomStore } from "../../../store/roomStore.js";
import { gameStateManager } from "../../../game/GameStateManager.js";
import { sendRoomUpdate } from "./update.js";

export function handleKickUser(
  io: SocketServer,
  socket: Socket,
  data: {
    code: string;
    userId: string;
    targetUserId: string;
  },
): void {
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
    socket.leave(code);

    if (room.players.size === 0) {
      roomStore.delete(code);
      gameStateManager.removeGame(code);
    } else {
      if (room.creatorId === userId && room.players.size > 0) {
        const newCreator = Array.from(room.players.values())[0];
        room.creatorId = newCreator.id;
      }
      sendRoomUpdate(io, code);
    }
  }
}

export function handleRestartGame(
  io: SocketServer,
  socket: Socket,
  data: {
    code: string;
    userId: string;
  },
): void {
  const { code, userId } = data;
  const room = roomStore.get(code);
  if (room && room.creatorId === userId) {
    room.gameStatus = "waiting";
    for (const player of room.players.values()) {
      player.team = null;
      player.role = null;
      player.isReady = false;
    }
    gameStateManager.removeGame(code);
    sendRoomUpdate(io, code);
    io.to(code).emit("game-restarted");
  }
}

export function handleEndGame(
  io: SocketServer,
  socket: Socket,
  data: {
    code: string;
    userId: string;
  },
): void {
  const { code, userId } = data;
  const room = roomStore.get(code);
  if (room && room.creatorId === userId) {
    room.gameStatus = "finished";
    gameStateManager.endGame(code, null);
    sendRoomUpdate(io, code);
    io.to(code).emit("game-over", { winner: null });
  }
}
