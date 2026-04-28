// backend/src/socket/handlers/vote.ts
import { Socket, Server as SocketServer } from "socket.io";
import { gameStateManager } from "../../game/GameStateManager.js";

export function handleStartVote(
  io: SocketServer,
  socket: Socket,
  data: {
    code: string;
    userId: string;
    roundNumber: number;
  },
): void {
  const { code, userId } = data;
  const game = gameStateManager.getGame(code);

  if (!game || !game.isActive) {
    socket.emit("vote-error", { error: "Game not active" });
    return;
  }

  // بررسی اینکه کاربر Spymaster تیم فعلی است
  const currentTurn = game.turnState.turn;
  const isSpymaster =
    currentTurn === "red"
      ? game.turnState.redTeam.spymaster === userId
      : game.turnState.blueTeam.spymaster === userId;

  if (!isSpymaster) {
    socket.emit("vote-error", { error: "Only spymaster can start voting" });
    return;
  }

  // جلسه رأی‌گیری قبلاً در giveClue شروع شده
  if (game.voteSession && game.voteSession.isActive) {
    io.to(code).emit("vote-started", {
      roundNumber: game.voteSession.roundNumber,
      timeout: 60000,
    });
  }
}

// export function handleCastVote(
//   io: SocketServer,
//   socket: Socket,
//   data: {
//     code: string;
//     userId: string;
//     wordIndex: number;
//   },
// ): void {
//   const { code, userId, wordIndex } = data;
//   const result = gameStateManager.castVote(code, userId, wordIndex);

//   if (result.success) {
//     io.to(code).emit("vote-cast", { userId, wordIndex });

//     if (result.revealed) {
//       io.to(code).emit("vote-result", {
//         selectedWord: wordIndex,
//         color: result.revealed.color,
//         isGameOver: result.revealed.isGameOver,
//         newTurn: result.newTurn,
//         winner: result.winner,
//       });
//     } else {
//       if (result.voteCount) {
//         io.to(code).emit("vote-count", {
//           votes: Array.from(result.voteCount.entries()),
//         });
//       }
//     }
//   } else {
//     socket.emit("vote-error", { error: result.error });
//   }
// }

export function handleGetVoteStatus(
  io: SocketServer,
  socket: Socket,
  data: {
    code: string;
  },
): void {
  const { code } = data;
  const game = gameStateManager.getGame(code);

  if (game && game.voteSession && game.voteSession.isActive) {
    const voteCount = new Map<number, number>();
    for (const wordIdx of game.voteSession.votes.values()) {
      voteCount.set(wordIdx, (voteCount.get(wordIdx) || 0) + 1);
    }

    socket.emit("vote-status", {
      isActive: true,
      totalVoters: game.voteSession.totalVoters,
      votersCount: game.voteSession.voters.size,
      votes: Array.from(voteCount.entries()),
    });
  } else {
    socket.emit("vote-status", { isActive: false });
  }
}
