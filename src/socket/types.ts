// backend/src/socket/types.ts
export interface Player {
  id: string;
  name: string;
  team: "red" | "blue" | null;
  role: "spymaster" | "guesser" | null;
  socketId: string;
  isReady: boolean;
}

export interface Room {
  code: string;
  creatorId: string;
  players: Map<string, Player>;
  gameStatus: "waiting" | "active" | "finished";
}

export interface GameWord {
  word: string;
  color: "red" | "blue" | "neutral" | "assassin";
  isRevealed: boolean;
}

export interface GameSession {
  roomCode: string;
  words: GameWord[];
  turn: "red" | "blue";
  redTeam: {
    spymaster: string | null;
    guessers: string[];
    remainingWords: number;
  };
  blueTeam: {
    spymaster: string | null;
    guessers: string[];
    remainingWords: number;
  };
  currentClue?: {
    clue: string;
    number: number;
    giverId: string;
  };
  remainingGuesses: number;
  winner: "red" | "blue" | null;
}

// Socket event payload types
export interface JoinRoomPayload {
  code: string;
  userId: string;
  playerName: string;
}

export interface PlayerReadyPayload {
  code: string;
  userId: string;
  isReady: boolean;
}

export interface GiveCluePayload {
  code: string;
  userId: string;
  clue: string;
  number: number;
}

export interface MakeGuessPayload {
  code: string;
  userId: string;
  wordIndex: number;
}

export interface AssignRolePayload {
  code: string;
  userId: string;
  team: "red" | "blue";
  role: "spymaster" | "guesser";
}

export interface VotePayload {
  code: string;
  userId: string;
  wordIndex: number;
}
