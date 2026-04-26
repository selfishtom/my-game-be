// Connection
export { handleConnection } from "./connection.js";

// Room handlers
export {
  handleJoinRoom,
  handlePlayerReady,
  handleStartGame,
  handleSwitchTeam,
  handleSwitchRole,
  handleKickUser,
  handleLeaveRoom,
  handleRestartGame,
  handleEndGame,
  sendRoomUpdate,
} from "./room/index.js";

// Game handlers
export {
  handleGiveClue,
  handleMakeGuess,
  handleEndTurn,
  handleAssignRole,
} from "./game.js";
