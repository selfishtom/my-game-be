// backend/src/index.ts
import { createServer } from "http";
import { Server } from "socket.io";
import { app } from "./server.js";
import { setupSocketHandlers } from "./socket/index.js";

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket"],
});

// راه‌اندازی تمام هندلرهای Socket
setupSocketHandlers(io);

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket endpoint: ws://localhost:${PORT}`);
});
