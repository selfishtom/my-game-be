// backend/src/socket/index.ts
import { Server as SocketServer } from "socket.io";
import { handleConnection } from "./handlers/connection.js";
import {
  handleJoinRoom,
  handlePlayerReady,
  handleLeaveRoom,
  handleStartGame,
  handleKickUser,
  handleRestartGame,
  handleEndGame,
  sendRoomUpdate,
} from "./handlers/room/index.js";
import {
  handleSelectTeam,
  handleSelectRole,
  handleSwitchTeam,
  handleSwitchRole,
} from "./handlers/room/switch.js";
import {
  handleGiveClue,
  handleMakeGuess,
  handleEndTurn,
  handleAssignRole,
} from "./handlers/game.js";

export function setupSocketHandlers(io: SocketServer): void {
  io.on("connection", (socket) => {
    // هندلر اصلی اتصال
    handleConnection(io, socket);

    // ============ هندلرهای روم ============
    socket.on("join-room", (data) => handleJoinRoom(io, socket, data));
    socket.on("player-ready", (data) => handlePlayerReady(io, socket, data));
    socket.on("leave-room", (data) => handleLeaveRoom(io, socket, data));
    socket.on("start-game", (data) => handleStartGame(io, socket, data));
    socket.on("kick-user", (data) => handleKickUser(io, socket, data));
    socket.on("restart-game", (data) => handleRestartGame(io, socket, data));
    socket.on("end-game", (data) => handleEndGame(io, socket, data));

    // ============ هندلرهای انتخاب تیم و نقش (جدید) ============
    socket.on("select-team", (data) => handleSelectTeam(io, socket, data));
    socket.on("select-role", (data) => handleSelectRole(io, socket, data));
    socket.on("switch-team", (data) => handleSwitchTeam(io, socket, data));
    socket.on("switch-role", (data) => handleSwitchRole(io, socket, data));

    // ============ هندلرهای بازی ============
    socket.on("give-clue", (data, callback) =>
      handleGiveClue(io, socket, data, callback),
    );
    socket.on("make-guess", (data, callback) =>
      handleMakeGuess(io, socket, data, callback),
    );
    socket.on("end-turn", (data) => handleEndTurn(io, socket, data));
    socket.on("assign-role", (data) => handleAssignRole(io, socket, data));
  });
}
