import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// prettier-ignore
const envFile = process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";
dotenv.config({ path: envFile });
dotenv.config();

const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const LOG_LEVEL = process.env.LOG_LEVEL || "info";

console.log(`🚀 Running in ${process.env.NODE_ENV || "development"} mode`);
console.log(`📡 Frontend URL: ${FRONTEND_URL}`);
console.log(`📝 Log level: ${LOG_LEVEL}`);

export const app = express();

// prettier-ignore
app.use(cors({
  origin: FRONTEND_URL,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

app.use(express.json());

app.post("/create-room", (req, res) => {
  // تولید کد 6 رقمی تصادفی
  const generateRoomCode = () => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  };

  const roomCode = generateRoomCode();
  console.log(`🏠 New room created via API: ${roomCode}`);

  res.json({ success: true, code: roomCode });
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// Words API
app.get("/words", (req, res) => {
  // TODO: return words from words.ts
  res.json({ message: "Words endpoint - to be implemented" });
});
