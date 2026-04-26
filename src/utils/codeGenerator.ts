import { GAME_CONSTANTS } from "./constants.js";

export function generateRoomCode(): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < GAME_CONSTANTS.ROOM_CODE_LENGTH; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

export function isValidRoomCode(code: string): boolean {
  return (
    code.length === GAME_CONSTANTS.ROOM_CODE_LENGTH && /^[A-Z0-9]+$/.test(code)
  );
}
