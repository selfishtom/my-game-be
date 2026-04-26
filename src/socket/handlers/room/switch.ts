// backend/src/socket/handlers/room/switch.ts
import { Socket, Server as SocketServer } from "socket.io";
import { roomStore } from "../../../store/roomStore.js";
import { gameStateManager } from "../../../game/GameStateManager.js";
import { sendRoomUpdate } from "./update.js";

// انتخاب تیم (از Spectator به عضو تیم)
export function handleSelectTeam(
  io: SocketServer,
  socket: Socket,
  data: {
    code: string;
    userId: string;
    team: "red" | "blue";
  },
): void {
  const { code, userId, team } = data;
  const room = roomStore.get(code);

  if (room && room.players.has(userId)) {
    const player = room.players.get(userId)!;

    // فقط Spectatorها می‌توانند تیم انتخاب کنند
    if (player.team === null) {
      player.team = team;
      player.role = null;
      console.log(
        `✅ ${player.name} joined ${team === "red" ? "🔴 Red" : "🔵 Blue"} team`,
      );
      sendRoomUpdate(io, code);
    } else {
      console.log(`⚠️ ${player.name} already in team ${player.team}`);
      socket.emit("error", {
        error:
          'شما قبلاً در یک تیم عضو هستید. برای تغییر تیم از دکمه "تغییر تیم" استفاده کنید.',
      });
    }
  }
}

// انتخاب نقش (بعد از انتخاب تیم)
export function handleSelectRole(
  io: SocketServer,
  socket: Socket,
  data: {
    code: string;
    userId: string;
    team: "red" | "blue";
    role: "spymaster" | "guesser";
  },
): void {
  const { code, userId, team, role } = data;
  const room = roomStore.get(code);

  if (room && room.players.has(userId)) {
    const player = room.players.get(userId)!;

    // بررسی اینکه کاربر در تیم درست باشد
    if (player.team !== team) {
      console.log(`⚠️ ${player.name} is not in ${team} team`);
      socket.emit("error", {
        error: `شما در تیم ${team === "red" ? "قرمز" : "آبی"} نیستید`,
      });
      return;
    }

    // بررسی اینکه آیا این نقش در این تیم قبلاً پر شده است
    const existingSpymaster = Array.from(room.players.values()).find(
      (p) => p.team === team && p.role === "spymaster" && p.id !== userId,
    );

    if (role === "spymaster" && existingSpymaster) {
      console.log(
        `⚠️ ${team} team already has a spymaster: ${existingSpymaster.name}`,
      );
      socket.emit("error", { error: "این تیم قبلاً Spymaster دارد" });
      return;
    }

    // ذخیره نقش در player
    player.role = role;
    console.log(
      `✅ ${player.name} became ${role === "spymaster" ? "🎭 Spymaster" : "🎯 Guesser"} of ${team === "red" ? "🔴 Red" : "🔵 Blue"} team`,
    );

    // اگر بازی قبلاً شروع شده بود، در gameStateManager نیز ثبت کن
    const game = gameStateManager.getGame(code);
    if (game && game.isActive) {
      gameStateManager.assignRole(code, userId, team, role);
    }

    sendRoomUpdate(io, code);
  }
}

// تغییر تیم (برای بازیکنانی که قبلاً تیم انتخاب کرده‌اند)
export function handleSwitchTeam(
  io: SocketServer,
  socket: Socket,
  data: {
    code: string;
    userId: string;
    newTeam: "red" | "blue";
  },
): void {
  const { code, userId, newTeam } = data;
  const room = roomStore.get(code);

  if (room && room.players.has(userId) && room.gameStatus === "waiting") {
    const player = room.players.get(userId)!;
    const oldTeam = player.team;

    // تغییر تیم و ریست نقش
    player.team = newTeam;
    player.role = null;

    console.log(
      `🔄 ${player.name} switched from ${oldTeam || "spectator"} to ${newTeam} team (role reset to spectator)`,
    );
    sendRoomUpdate(io, code);
  }
}

// تغییر نقش (برای بازیکنانی که قبلاً نقش انتخاب کرده‌اند)
export function handleSwitchRole(
  io: SocketServer,
  socket: Socket,
  data: {
    code: string;
    userId: string;
    team: "red" | "blue";
    role: "spymaster" | "guesser";
  },
): void {
  const { code, userId, team, role } = data;
  const room = roomStore.get(code);

  if (room && room.players.has(userId) && room.gameStatus === "waiting") {
    const player = room.players.get(userId)!;

    // بررسی اینکه کاربر در تیم درست باشد
    if (player.team !== team) {
      console.log(`⚠️ ${player.name} is not in ${team} team`);
      socket.emit("error", {
        error: `شما در تیم ${team === "red" ? "قرمز" : "آبی"} نیستید`,
      });
      return;
    }

    // بررسی Spymaster تکراری
    if (role === "spymaster") {
      const existingSpymaster = Array.from(room.players.values()).find(
        (p) => p.team === team && p.role === "spymaster" && p.id !== userId,
      );
      if (existingSpymaster) {
        console.log(`⚠️ ${team} team already has a spymaster`);
        socket.emit("error", { error: "این تیم قبلاً Spymaster دارد" });
        return;
      }
    }

    // تغییر نقش
    player.role = role;
    console.log(
      `🔄 ${player.name} switched to ${role === "spymaster" ? "🎭 Spymaster" : "🎯 Guesser"} of ${team === "red" ? "🔴 Red" : "🔵 Blue"} team`,
    );

    sendRoomUpdate(io, code);
  }
}
