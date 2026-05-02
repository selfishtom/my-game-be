import { Socket, Server as SocketServer } from "socket.io";
import { roomStore } from "../../../store/roomStore.js";
import { gameStateManager } from "../../../game/GameStateManager.js";
import { sendRoomUpdate } from "./update.js";

// prettier-ignore
export function handleRestartGame( io: SocketServer, socket: Socket, data: { code: string; userId: string; })
{
  const { code, userId } = data;
  const room = roomStore.get(code);

  console.log(`🔄 Restart game requested for room ${code} by ${userId}`);

  if (!room) {
    socket.emit("error", { error: "Room not found" });
    return;
  }

  if (room.creatorId !== userId) {
    socket.emit("error", { error: "Only creator can restart the game" });
    return;
  }

  // ذخیره لیست بازیکنان فعلی برای اضافه کردن مجدد
  const currentPlayers = Array.from(room.players.values());
  const currentSpectators = Array.from(room.spectators.values());

  // ریست کردن روم
  room.gameStatus = "active";
  room.players.clear();
  room.spectators.clear();

  // اضافه کردن همه بازیکنان قبلی به عنوان تماشاگر
  for (const player of currentPlayers) {
    room.spectators.set(player.id, {
      id: player.id,
      name: player.name,
      socketId: player.socketId,
      joinedAt: Date.now(),
    });
  }
  for (const spectator of currentSpectators) {
    room.spectators.set(spectator.id, {
      id: spectator.id,
      name: spectator.name,
      socketId: spectator.socketId,
      joinedAt: Date.now(),
    });
  }

  // شروع مجدد بازی (تولید کلمات جدید)
  const gameSession = gameStateManager.startGame(code);

  // ارسال به‌روزرسانی به همه
  sendRoomUpdate(io, code);

  // ارسال وضعیت جدید بازی به همه
  io.to(code).emit("game-started", {
    words: gameSession.words,
    turn: gameSession.turnState.turn,
    remainingOperatives: gameSession.turnState.remainingOperatives,
  });

  // بستن مودال در کلاینت‌ها
  io.to(code).emit("game-restarted");

  console.log(`✅ Game restarted in room ${code}`);
}
