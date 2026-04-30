// backend/src/socket/handlers/room/join.ts
import { Socket, Server as SocketServer } from "socket.io";
import { roomStore } from "../../../store/roomStore.js";
import { Player, Spectator } from "../../types.js";
import { sendRoomUpdate } from "./update.js";
import { gameStateManager } from "../../../game/GameStateManager.js";

export function handleJoinRoom(
  io: SocketServer,
  socket: Socket,
  data: {
    code: string;
    userId: string;
    playerName: string;
  },
): void {
  const { code, userId, playerName } = data;
  console.log(`📥 Join room request: ${code} from ${playerName} (${userId})`);

  let room = roomStore.get(code);
  const isNewRoom = !room;

  if (!room) {
    room = {
      code,
      creatorId: userId,
      players: new Map(),
      spectators: new Map(),
      gameStatus: "active",
    };
    roomStore.set(code, room);
    console.log(`🏠 New room created: ${code} by ${playerName}`);

    const gameSession = gameStateManager.startGame(code);

    io.to(code).emit("gameStarted", {
      words: gameSession.words,
      turn: gameSession.turnState.turn,
      remainingOperatives: gameSession.turnState.remainingOperatives,
    });
  }

  // اضافه کردن کاربر به عنوان Spectator (بدون هیچ ready)
  if (!room.spectators.has(userId) && !room.players.has(userId)) {
    room.spectators.set(userId, {
      id: userId,
      name: playerName,
      socketId: socket.id,
      joinedAt: Date.now(),
    });
    console.log(
      `👁️ Spectator added: ${playerName}. Total spectators: ${room.spectators.size}`,
    );
  } else {
    // به‌روزرسانی socketId برای reconnect
    const spectators = room.spectators.get(userId);
    if (spectators) spectators.socketId = socket.id;
    const players = room.players.get(userId);
    if (players) players.socketId = socket.id;
    console.log(`🔄 User reconnected: ${playerName}`);
  }

  // 🔥 ابتدا به روم بپیوند (قبل از هر چیزی)
  socket.join(code);
  (socket as any).userId = userId;
  (socket as any).roomCode = code;

  const currentGame = gameStateManager.getGame(code);
  if (currentGame) {
    socket.emit("game-started", {
      words: currentGame.words,
      turn: currentGame.turnState.turn,
      remainingOperatives: currentGame.turnState.remainingOperatives,
    });
    socket.emit("game-state-sync", {
      words: currentGame.words,
      turn: currentGame.turnState.turn,
      remainingOperatives: currentGame.turnState.remainingOperatives,
      currentClue: currentGame.turnState.currentClue || null,
      redTeam: currentGame.turnState.redTeam,
      blueTeam: currentGame.turnState.blueTeam,
      winner: currentGame.turnState.winner,
    });
  }

  sendRoomUpdate(io, code);
}
