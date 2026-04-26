export const GAME_CONSTANTS = {
  ROOM_CODE_LENGTH: 6,
  TOTAL_WORDS: 25,
  RED_WORDS_COUNT: 8,
  BLUE_WORDS_COUNT: 9,
  NEUTRAL_WORDS_COUNT: 7,
  ASSASSIN_WORDS_COUNT: 1,
  VOTE_THRESHOLD_PERCENT: 0.5, // 50% + 1
} as const;

export const TEAMS = {
  RED: "red",
  BLUE: "blue",
} as const;

export const WORD_COLORS = {
  RED: "red",
  BLUE: "blue",
  NEUTRAL: "neutral",
  ASSASSIN: "assassin",
} as const;
