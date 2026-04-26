// backend/src/store/roomStore.ts
import { Room, Player } from "../socket/types.js";

// ذخیره‌سازی روم‌ها در حافظه (در production از Redis استفاده کنید)
const rooms = new Map<string, Room>();

export const roomStore = {
  /**
   * دریافت روم با کد
   * @param code - کد روم
   * @returns روم مورد نظر یا undefined
   */
  get(code: string): Room | undefined {
    return rooms.get(code);
  },

  /**
   * ذخیره یا به‌روزرسانی روم
   * @param code - کد روم
   * @param room - شیء روم
   */
  set(code: string, room: Room): void {
    rooms.set(code, room);
    console.log(`💾 Room saved: ${code}, total rooms: ${rooms.size}`);
  },

  /**
   * حذف روم
   * @param code - کد روم
   * @returns موفقیت آمیز بودن حذف
   */
  delete(code: string): boolean {
    const deleted = rooms.delete(code);
    if (deleted) {
      console.log(`🗑️ Room deleted: ${code}, remaining rooms: ${rooms.size}`);
    }
    return deleted;
  },

  /**
   * بررسی وجود روم
   * @param code - کد روم
   * @returns وجود یا عدم وجود روم
   */
  has(code: string): boolean {
    return rooms.has(code);
  },

  /**
   * دریافت تعداد کل روم‌ها
   * @returns تعداد روم‌ها
   */
  size(): number {
    return rooms.size;
  },

  /**
   * دریافت همه روم‌ها
   * @returns Map تمام روم‌ها
   */
  getAll(): Map<string, Room> {
    return new Map(rooms);
  },

  /**
   * دریافت لیست بازیکنان یک روم
   * @param code - کد روم
   * @returns آرایه‌ای از بازیکنان
   */
  getPlayers(code: string): Player[] {
    const room = rooms.get(code);
    return room ? Array.from(room.players.values()) : [];
  },

  /**
   * اضافه کردن بازیکن به روم
   * @param code - کد روم
   * @param player - بازیکن جدید
   * @returns موفقیت آمیز بودن عملیات
   */
  addPlayer(code: string, player: Player): boolean {
    const room = rooms.get(code);
    if (!room) return false;

    if (!room.players.has(player.id)) {
      room.players.set(player.id, player);
      console.log(`👤 Player ${player.name} added to room ${code}`);
      return true;
    }
    return false;
  },

  /**
   * حذف بازیکن از روم
   * @param code - کد روم
   * @param userId - شناسه کاربر
   * @returns موفقیت آمیز بودن عملیات
   */
  removePlayer(code: string, userId: string): boolean {
    const room = rooms.get(code);
    if (!room) return false;

    const player = room.players.get(userId);
    if (player) {
      room.players.delete(userId);
      console.log(`👋 Player ${player.name} removed from room ${code}`);
      return true;
    }
    return false;
  },

  /**
   * به‌روزرسانی وضعیت آمادگی بازیکن
   * @param code - کد روم
   * @param userId - شناسه کاربر
   * @param isReady - وضعیت آمادگی
   * @returns موفقیت آمیز بودن عملیات
   */
  setPlayerReady(code: string, userId: string, isReady: boolean): boolean {
    const room = rooms.get(code);
    if (!room) return false;

    const player = room.players.get(userId);
    if (player) {
      player.isReady = isReady;
      console.log(`✅ Player ${player.name} ready status: ${isReady}`);
      return true;
    }
    return false;
  },

  /**
   * به‌روزرسانی نقش و تیم بازیکن
   * @param code - کد روم
   * @param userId - شناسه کاربر
   * @param team - تیم (red/blue)
   * @param role - نقش (spymaster/guesser)
   * @returns موفقیت آمیز بودن عملیات
   */
  setPlayerRole(
    code: string,
    userId: string,
    team: "red" | "blue" | null,
    role: "spymaster" | "guesser" | null,
  ): boolean {
    const room = rooms.get(code);
    if (!room) return false;

    const player = room.players.get(userId);
    if (player) {
      player.team = team;
      player.role = role;
      console.log(
        `🎭 Player ${player.name} assigned: team=${team}, role=${role}`,
      );
      return true;
    }
    return false;
  },

  /**
   * به‌روزرسانی وضعیت بازی روم
   * @param code - کد روم
   * @param status - وضعیت جدید (waiting/active/finished)
   * @returns موفقیت آمیز بودن عملیات
   */
  setGameStatus(
    code: string,
    status: "waiting" | "active" | "finished",
  ): boolean {
    const room = rooms.get(code);
    if (!room) return false;

    room.gameStatus = status;
    console.log(`🎮 Room ${code} game status: ${status}`);
    return true;
  },

  /**
   * بررسی خالی بودن روم
   * @param code - کد روم
   * @returns خالی بودن یا نبودن
   */
  isEmpty(code: string): boolean {
    const room = rooms.get(code);
    return room ? room.players.size === 0 : true;
  },

  /**
   * دریافت سازنده روم
   * @param code - کد روم
   * @returns شناسه سازنده یا undefined
   */
  getCreatorId(code: string): string | undefined {
    const room = rooms.get(code);
    return room?.creatorId;
  },

  /**
   * پاک کردن همه روم‌ها (برای تست)
   */
  clearAll(): void {
    rooms.clear();
    console.log("🗑️ All rooms cleared");
  },

  /**
   * به‌روزرسانی socketId بازیکن (برای reconnect)
   * @param code - کد روم
   * @param userId - شناسه کاربر
   * @param socketId - شناسه سوکت جدید
   * @returns موفقیت آمیز بودن عملیات
   */
  updateSocketId(code: string, userId: string, socketId: string): boolean {
    const room = rooms.get(code);
    if (!room) return false;

    const player = room.players.get(userId);
    if (player) {
      player.socketId = socketId;
      console.log(`🔄 Socket ID updated for player ${player.name}`);
      return true;
    }
    return false;
  },
};

// برای دیباگ - نمایش وضعیت روم‌ها هر 30 ثانیه
if (process.env.NODE_ENV === "development") {
  setInterval(() => {
    if (rooms.size > 0) {
      console.log(`📊 Current rooms: ${rooms.size}`);
      for (const [code, room] of rooms.entries()) {
        console.log(
          `   - Room ${code}: ${room.players.size} players, status: ${room.gameStatus}`,
        );
      }
    }
  }, 30000);
}
