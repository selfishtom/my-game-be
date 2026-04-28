// backend/src/socket/handlers/connection.ts
import { Socket, Server as SocketServer } from "socket.io";
import { roomStore } from "../../store/roomStore.js";
import { gameStateManager } from "../../game/GameStateManager.js";
import { sendRoomUpdate } from "./room/update.js";

export function handleConnection(io: SocketServer, socket: Socket): void {
  console.log("🔌 Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
    handleDisconnect(io, socket);
  });

  socket.on("error", (error) => {
    console.error("Socket error:", socket.id, error);
  });
}

function handleDisconnect(io: SocketServer, socket: Socket): void {
  // پیدا کردن کاربر در روم‌ها
  const rooms = roomStore.getAll();

  for (const [code, room] of rooms.entries()) {
    let removed = false;
    let userName = "";

    // بررسی در players
    for (const [userId, player] of room.players.entries()) {
      if (player.socketId === socket.id) {
        room.players.delete(userId);
        userName = player.name;
        removed = true;
        console.log(`👋 Player disconnected: ${userName} from room ${code}`);
        break;
      }
    }

    // اگر پیدا نشد، در spectators بررسی کن
    if (!removed) {
      for (const [userId, spectator] of room.spectators.entries()) {
        if (spectator.socketId === socket.id) {
          room.spectators.delete(userId);
          userName = spectator.name;
          removed = true;
          console.log(
            `👁️ Spectator disconnected: ${userName} from room ${code}`,
          );
          break;
        }
      }
    }

    if (removed) {
      // 🔥 اگر روم کاملاً خالی شد، آن را حذف کن
      if (room.players.size === 0 && room.spectators.size === 0) {
        roomStore.delete(code);
        gameStateManager.removeGame(code);
        console.log(`🗑️ Room deleted (empty after disconnect): ${code}`);
      } else {
        // اگر سازنده قطع شد، نقش را به نفر بعدی منتقل کن
        if (
          room.creatorId ===
          (room.players.get(userName)?.id || room.spectators.get(userName)?.id)
        ) {
          // این بخش در handleLeaveRoom انجام می‌شود
        }
        sendRoomUpdate(io, code);
      }
      break;
    }
  }
}
