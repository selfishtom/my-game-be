// backend/src/game/voteManager.ts

export interface VoteSession {
  roomCode: string;
  targetTeam: "red" | "blue";
  roundNumber: number;
  votes: Map<string, number>; // userId -> wordIndex
  voters: Set<string>; // کاربرانی که رأی داده‌اند
  totalVoters: number;
  isActive: boolean;
  startTime: number;
  timeout?: NodeJS.Timeout;
}

// آستانه رأی‌گیری (50% + 1)
export function getVoteThreshold(totalVoters: number): number {
  return Math.floor(totalVoters * 0.5) + 1;
}

// ایجاد جلسه رأی‌گیری جدید
export function createVoteSession(
  roomCode: string,
  targetTeam: "red" | "blue",
  guesserIds: string[],
  roundNumber: number,
): VoteSession {
  return {
    roomCode,
    targetTeam,
    roundNumber,
    votes: new Map(),
    voters: new Set(),
    totalVoters: guesserIds.length,
    isActive: true,
    startTime: Date.now(),
  };
}

// ثبت رأی
export function castVote(
  voteSession: VoteSession,
  userId: string,
  wordIndex: number,
): {
  success: boolean;
  error?: string;
  voteCount?: Map<number, number>;
  reachedThreshold?: boolean;
  selectedWord?: number;
} {
  if (!voteSession.isActive) {
    return { success: false, error: "Voting session is not active" };
  }

  if (voteSession.voters.has(userId)) {
    return { success: false, error: "You have already voted" };
  }

  // ثبت رأی
  voteSession.voters.add(userId);
  voteSession.votes.set(userId, wordIndex);

  // شمارش آرا
  const voteCount = new Map<number, number>();
  for (const wordIdx of voteSession.votes.values()) {
    voteCount.set(wordIdx, (voteCount.get(wordIdx) || 0) + 1);
  }

  // بررسی رسیدن به آستانه
  const threshold = getVoteThreshold(voteSession.totalVoters);
  let reachedThreshold = false;
  let selectedWord: number | undefined;

  for (const [wordIdx, count] of voteCount.entries()) {
    if (count >= threshold) {
      reachedThreshold = true;
      selectedWord = wordIdx;
      break;
    }
  }

  return {
    success: true,
    voteCount,
    reachedThreshold,
    selectedWord,
  };
}

// پایان جلسه رأی‌گیری
export function endVoteSession(voteSession: VoteSession): void {
  voteSession.isActive = false;
  if (voteSession.timeout) {
    clearTimeout(voteSession.timeout);
  }
}

// تنظیم تایم‌اوت برای جلسه رأی‌گیری (مثلاً 60 ثانیه)
export function setVoteTimeout(
  voteSession: VoteSession,
  onTimeout: () => void,
  timeoutMs: number = 60000,
): void {
  voteSession.timeout = setTimeout(() => {
    if (voteSession.isActive) {
      onTimeout();
      endVoteSession(voteSession);
    }
  }, timeoutMs);
}
