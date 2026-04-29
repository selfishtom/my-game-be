// backend/src/index.ts
import { createServer } from "http";
import { Server } from "socket.io";
import { app } from "./server.js";
import { setupSocketHandlers } from "./socket/index.js";
import dotenv from "dotenv";

const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";
dotenv.config({ path: envFile });
dotenv.config();

const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const httpServer = createServer(app);
const io = new Server(httpServer, {
  path: "/api/socket",
  cors: {
    origin: FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket"],
});

setupSocketHandlers(io);

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`🌐 CORS enabled for: ${FRONTEND_URL}`);
  console.log(`📡 API endpoint: http://localhost:${PORT}/api/create-room`);
});
