import express from "express";
import cors from "cors";

export const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Words API
app.get("/api/words", (req, res) => {
  // TODO: return words from words.ts
  res.json({ message: "Words endpoint - to be implemented" });
});
