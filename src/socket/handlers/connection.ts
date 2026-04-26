// backend/src/socket/handlers/connection.ts
import { Socket, Server as SocketServer } from "socket.io";

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
  const rooms = io.sockets.adapter.rooms;
  const socketRooms = Array.from(socket.rooms);

  for (const roomCode of socketRooms) {
    if (roomCode !== socket.id) {
      socket.leave(roomCode);
      // به بقیه اعضای روم اطلاع بده
      socket.to(roomCode).emit("user-left", { socketId: socket.id });
    }
  }
}
