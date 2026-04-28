// backend/src/socket/handlers/room/start.ts
import { Socket, Server as SocketServer } from "socket.io";
import { roomStore } from "../../../store/roomStore.js";
import { gameStateManager } from "../../../game/GameStateManager.js";
import { sendRoomUpdate } from "./update.js";
import type { Player } from "../../types.js";

export function sendCurrentGameState(
  io: SocketServer,
  code: string,
  socketId: string,
): void {
  const gameSession = gameStateManager.getGame(code);
  if (!gameSession) {
    console.log(`⚠️ No game session found for room ${code}`);
    return;
  }

  console.log(
    `📡 Sending current game state to socket ${socketId} for room ${code}`,
  );

  const eventData = {
    words: gameSession.words,
    turn: gameSession.turnState.turn,
    remainingGuesses: gameSession.turnState.remainingGuesses,
    currentClue: gameSession.turnState.currentClue,
    redTeam: gameSession.turnState.redTeam,
    blueTeam: gameSession.turnState.blueTeam,
    winner: gameSession.turnState.winner,
  };

  // ارسال فقط به سوکت مشخص شده
  io.to(socketId).emit("game-started", eventData);
}

export function startGameAutomatically(io: SocketServer, code: string): void {
  const room = roomStore.get(code);
  if (!room || room.gameStatus !== "waiting") return;

  console.log(`🚀 Starting game automatically in room: ${code}`);
  room.gameStatus = "active";

  const gameSession = gameStateManager.startGame(code);

  // 🔥 ارسال رویداد game-started به همه افراد در روم (از جمله Spectatorها)
  const eventData = {
    words: gameSession.words,
    turn: gameSession.turnState.turn,
    remainingGuesses: gameSession.turnState.remainingGuesses,
  };

  console.log(`📡 Emitting 'game-started' to room ${code}:`, eventData);
  io.to(code).emit("game-started", eventData);

  sendRoomUpdate(io, code);

  console.log(
    `✅ Game started in room ${code}, turn: ${gameSession.turnState.turn}`,
  );
}

export function handleJoinGame(
  io: SocketServer,
  socket: Socket,
  data: {
    code: string;
    userId: string;
    team: "red" | "blue";
    role: "spymaster" | "operative";
  },
): void {
  const { code, userId, team, role } = data;
  const room = roomStore.get(code);

  if (!room || room.gameStatus !== "active") {
    socket.emit("error", { error: "بازی فعال نیست" });
    return;
  }

  const spectator = room.spectators.get(userId);
  if (!spectator) {
    socket.emit("error", { error: "شما در لیست تماشاگران نیستید" });
    return;
  }

  room.spectators.delete(userId);

  const newPlayer: Player = {
    id: spectator.id,
    name: spectator.name,
    team,
    role,
    socketId: spectator.socketId,
    joinedAt: spectator.joinedAt,
  };

  room.players.set(userId, newPlayer);
  gameStateManager.assignRole(code, userId, team, role);

  console.log(`🎮 ${spectator.name} joined the game as ${team}/${role}`);

  const game = gameStateManager.getGame(code);
  if (game) {
    io.to(code).emit("game-state-update", game.turnState);
  }

  sendRoomUpdate(io, code);
}
