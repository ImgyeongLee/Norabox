import type { Server as HttpServer } from "node:http";
import { randomUUID } from "node:crypto";
import { Server, type Socket } from "socket.io";
import { prisma } from "@/lib/prisma";
import { avatarUrlFor } from "@/lib/avatar";
import { USER_ACTIVE } from "@/lib/users";
import { inactiveCutoff, purgeIfExpired } from "@/lib/rooms";
import { verifySocketToken } from "@/lib/session";
import { z } from "zod";
import { MAX_MEMO, MAX_POST_TRACKS, MAX_ROOM_ITEMS } from "@/lib/limits";
import { roomSongSchema } from "@/lib/validation";
import type { ErrorCode } from "@/i18n/messages/en";
import type {
  Ack,
  ClientToServerEvents,
  LoopMode,
  MemberView,
  Playback,
  PlaylistEntry,
  Role,
  RoomSnapshot,
  ServerToClientEvents,
} from "@/lib/room-types";

type IO = Server<ClientToServerEvents, ServerToClientEvents>;
type ClientSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type SocketData = { roomId?: string; identity?: string };

/** How long an empty room stays in memory before it is unloaded. */
const EMPTY_ROOM_TTL_MS = 60_000;
/** A member who disconnects (e.g. refreshes the page) keeps their seat this long. */
const RECONNECT_GRACE_MS = 10_000;
/** How often occupied rooms are marked active and expired rooms are deleted (only while someone is listening). */
const SWEEP_INTERVAL_MS = 10 * 60_000;
/** Minimum gap between lastActiveAt writes for one room. */
const TOUCH_THROTTLE_MS = 60_000;

type Member = {
  memberId: string;
  identity: string;
  userId: string | null;
  clientIds: Set<string>;
  name: string;
  avatarUrl: string | null;
  sockets: Set<string>;
  leaveTimer: NodeJS.Timeout | null;
};

class Room {
  members = new Map<string, Member>();
  playback: Playback;
  private endTimer: NodeJS.Timeout | null = null;
  unloadTimer: NodeJS.Timeout | null = null;
  private lastTouch = 0;
  private writes: Promise<unknown> = Promise.resolve();

  constructor(
    private io: IO,
    readonly id: string,
    readonly code: string,
    private ownerClientId: string,
    private ownerUserId: string | null,
    public masterVolume: number,
    public loopMode: LoopMode,
    public items: PlaylistEntry[],
    public djs: Set<string>,
    currentItemId: string | null,
    public locked: boolean,
    /** While locked: identities of the people who were in the room when it was closed. */
    public allowed: Set<string>,
  ) {
    const itemId = items.some((i) => i.id === currentItemId && !i.hidden)
      ? currentItemId
      : (items.find((i) => !i.hidden)?.id ?? null);
    this.playback = { itemId, isPlaying: false, position: 0, updatedAt: Date.now(), seq: 0 };
  }

  isOwner(clientId: string, userId: string | null) {
    return clientId === this.ownerClientId || (!!this.ownerUserId && userId === this.ownerUserId);
  }

  /** Whether someone may join: always, unless the admin closed the room to newcomers. */
  canEnter(identity: string, clientId: string, userId: string | null) {
    if (!this.locked || this.isOwner(clientId, userId)) return true;
    return this.members.has(identity) || this.allowed.has(identity) || this.djs.has(identity);
  }

  roleOf(m: Member): Role {
    if (m.clientIds.has(this.ownerClientId) || (this.ownerUserId && m.userId === this.ownerUserId)) return "admin";
    return this.djs.has(m.identity) ? "dj" : "listener";
  }

  /**
   * Room state as one member should see it. Memos are the admin's private notes and hidden
   * songs are the admin's surprises, so only the admin gets them.
   */
  snapshot(forAdmin = false): RoomSnapshot {
    const members: MemberView[] = [...this.members.values()].map((m) => ({
      memberId: m.memberId,
      name: m.name,
      avatarUrl: m.avatarUrl,
      role: this.roleOf(m),
      signedIn: !!m.userId,
    }));
    const rank = { admin: 0, dj: 1, listener: 2 };
    members.sort((a, b) => rank[a.role] - rank[b.role] || a.name.localeCompare(b.name));
    return {
      code: this.code,
      masterVolume: this.masterVolume,
      loopMode: this.loopMode,
      locked: this.locked,
      // undefined fields aren't serialized, so memos never leave the server for non-admins.
      items: forAdmin
        ? this.items
        : this.items.filter((item) => !item.hidden).map((item) => ({ ...item, memo: undefined, hidden: undefined })),
      playback: this.playback,
      members,
    };
  }

  /**
   * Runs this room's playlist DB writes one at a time, in arrival order. Without it,
   * two DJs editing at once can deadlock in Postgres or leave the saved order
   * different from what everyone sees.
   */
  persist<T>(task: () => Promise<T>): Promise<T> {
    const run = this.writes.then(task, task);
    this.writes = run.catch(() => {});
    return run;
  }

  broadcast() {
    this.touch();
    // Per connection, because the admin's copy includes memos.
    let adminCopy: RoomSnapshot | undefined;
    let everyoneCopy: RoomSnapshot | undefined;
    for (const m of this.members.values()) {
      const isAdmin = this.roleOf(m) === "admin";
      const state = isAdmin ? (adminCopy ??= this.snapshot(true)) : (everyoneCopy ??= this.snapshot(false));
      for (const socketId of m.sockets) this.io.to(socketId).emit("room:state", state);
    }
  }

  /** Records activity so the room isn't deleted as inactive (throttled). */
  touch() {
    if (Date.now() - this.lastTouch < TOUCH_THROTTLE_MS) return;
    this.lastTouch = Date.now();
    prisma.room
      .update({ where: { id: this.id }, data: { lastActiveAt: new Date() } })
      .catch((e) => console.error("[room] failed to record activity", e));
  }

  current() {
    return this.items.find((i) => i.id === this.playback.itemId) ?? null;
  }

  /**
   * The nearest song after (dir 1) or before (dir -1) index `from` that isn't hidden,
   * wrapping around the playlist if `wrap`. Hidden songs only play when the admin picks them.
   */
  neighbor(from: number, dir: 1 | -1, wrap = false) {
    const n = this.items.length;
    for (let k = 1; k <= n; k++) {
      let i = from + dir * k;
      if (wrap) i = ((i % n) + n) % n;
      else if (i < 0 || i >= n) return null;
      if (!this.items[i].hidden) return this.items[i];
    }
    return null;
  }

  firstVisible() {
    return this.neighbor(-1, 1);
  }

  positionNow() {
    const p = this.playback;
    const pos = p.isPlaying ? p.position + (Date.now() - p.updatedAt) / 1000 : p.position;
    const dur = this.current()?.durationSec;
    return dur ? Math.min(pos, dur) : pos;
  }

  setPlayback(next: Partial<Omit<Playback, "updatedAt" | "seq">>) {
    const itemChanged = next.itemId !== undefined && next.itemId !== this.playback.itemId;
    this.playback = {
      ...this.playback,
      ...next,
      position: Math.max(0, next.position ?? this.playback.position),
      updatedAt: Date.now(),
      seq: this.playback.seq + 1,
    };
    this.scheduleEnd();
    // A hidden song is revealed to everyone once it starts playing.
    const item = this.current();
    if (item?.hidden && this.playback.isPlaying) {
      item.hidden = false;
      this.persist(() =>
        prisma.playlistItem.updateMany({ where: { id: item.id, roomId: this.id }, data: { hidden: false } }),
      ).catch((e) => console.error("[room] failed to reveal song", e));
    }
    if (itemChanged) {
      prisma.room
        .update({ where: { id: this.id }, data: { currentItemId: this.playback.itemId } })
        .catch((e) => console.error("[room] failed to save current item", e));
    }
    this.broadcast();
  }

  /** Server-side timer that advances the playlist when the current track ends. */
  private scheduleEnd() {
    if (this.endTimer) clearTimeout(this.endTimer);
    this.endTimer = null;
    const item = this.current();
    if (!this.playback.isPlaying || !item?.durationSec) return;
    const remainingMs = (item.durationSec - this.positionNow()) * 1000;
    const itemId = item.id;
    this.endTimer = setTimeout(() => this.trackEnded(itemId), Math.max(0, remainingMs) + 750);
  }

  /** Called by the end timer or a client report; ignores stale/duplicate reports. */
  trackEnded(itemId: string) {
    if (this.playback.itemId !== itemId || !this.playback.isPlaying) return;
    const dur = this.current()?.durationSec;
    const pos = this.positionNow();
    // Duplicate reports arrive right after we restarted/advanced — ignore them.
    if (dur ? pos < dur - Math.min(5, dur / 4) : pos < 5) return;

    if (this.loopMode === "one") return this.setPlayback({ position: 0, isPlaying: true });
    const idx = this.items.findIndex((i) => i.id === itemId);
    const next = this.neighbor(idx, 1) ?? (this.loopMode === "all" ? this.firstVisible() : null);
    if (next) return this.setPlayback({ itemId: next.id, position: 0, isPlaying: true });
    this.setPlayback({ position: 0, isPlaying: false });
  }

  play() {
    if (!this.playback.itemId) {
      const first = this.firstVisible();
      if (!first) return;
      return this.setPlayback({ itemId: first.id, position: 0, isPlaying: true });
    }
    if (this.playback.isPlaying) return;
    const dur = this.current()?.durationSec;
    const pos = dur && this.playback.position >= dur - 1 ? 0 : this.playback.position;
    this.setPlayback({ position: pos, isPlaying: true });
  }

  pause() {
    if (!this.playback.isPlaying) return;
    this.setPlayback({ position: this.positionNow(), isPlaying: false });
  }

  seek(position: number) {
    const dur = this.current()?.durationSec;
    this.setPlayback({ position: dur ? Math.min(position, dur - 0.5) : position });
  }

  step(dir: 1 | -1) {
    if (this.items.length === 0) return;
    if (dir === -1 && this.positionNow() > 3) return this.setPlayback({ position: 0 });
    const idx = this.items.findIndex((i) => i.id === this.playback.itemId);
    const target = idx === -1 ? this.firstVisible() : this.neighbor(idx, dir, true);
    if (target) this.setPlayback({ itemId: target.id, position: 0, isPlaying: true });
  }

  scheduleUnload(onUnload: () => void) {
    if (this.unloadTimer) clearTimeout(this.unloadTimer);
    this.unloadTimer = setTimeout(() => {
      if (this.members.size > 0) return;
      if (this.endTimer) clearTimeout(this.endTimer);
      onUnload();
    }, EMPTY_ROOM_TTL_MS);
  }
}

const rooms = new Map<string, Room>();
const loading = new Map<string, Promise<Room | null>>();

async function loadRoom(io: IO, slug: string): Promise<Room | null> {
  const cached = [...rooms.values()].find((r) => r.code.toLowerCase() === slug);
  if (cached) return cached;
  let pending = loading.get(slug);
  if (!pending) {
    pending = (async () => {
      await purgeIfExpired(slug);
      const row = await prisma.room.findUnique({
        where: { slug },
        include: { items: { orderBy: { position: "asc" } }, djs: true },
      });
      if (!row) return null;
      const room = new Room(
        io,
        row.id,
        row.code,
        row.ownerClientId,
        row.ownerUserId,
        row.masterVolume,
        (["none", "one", "all"].includes(row.loopMode) ? row.loopMode : "none") as LoopMode,
        row.items.map((i) => ({
          id: i.id,
          videoId: i.videoId,
          title: i.title,
          channel: i.channel,
          thumbnail: i.thumbnail,
          durationSec: i.durationSec,
          addedBy: i.addedBy,
          memo: i.memo,
          hidden: i.hidden,
        })),
        new Set(row.djs.map((d) => d.identity)),
        row.currentItemId,
        row.locked,
        new Set(row.allowedIdentities),
      );
      rooms.set(room.id, room);
      return room;
    })().finally(() => loading.delete(slug));
    loading.set(slug, pending);
  }
  return pending;
}

/**
 * Marks occupied rooms as active, then deletes rooms that have been inactive past
 * the TTL. Rooms people are in are never deleted, however long they just listen.
 *
 * Does nothing (no query) while nobody is in a room, so an idle server never wakes
 * the database and Neon can scale it to zero. Expiry still holds then, because every
 * room lookup purges an expired room first (purgeIfExpired); old rooms nobody visits
 * are cleaned up on the next sweep that runs while someone is listening.
 * Exported for tests.
 */
export async function sweepRooms() {
  try {
    const occupied = [...rooms.values()].filter((r) => r.members.size > 0).map((r) => r.id);
    if (occupied.length === 0) return;
    await prisma.room.updateMany({ where: { id: { in: occupied } }, data: { lastActiveAt: new Date() } });
    const { count } = await prisma.room.deleteMany({
      where: { lastActiveAt: { lt: inactiveCutoff() }, id: { notIn: occupied } },
    });
    if (count > 0) console.log(`[rooms] deleted ${count} inactive room(s)`);
  } catch (e) {
    console.error("[rooms] sweep failed", e);
  }
}

/** Errors are sent as codes (see src/i18n/messages) and shown in each listener's language. */
const fail = (ack: Ack | undefined, error: ErrorCode) => ack?.({ ok: false, error });
const ok = (ack: Ack | undefined) => ack?.({ ok: true });

export function attachSocketServer(httpServer: HttpServer, opts: { corsOrigins?: string[] } = {}) {
  const io: IO = new Server(httpServer, {
    // Needed when the app (e.g. on Vercel) and this server are on different origins.
    ...(opts.corsOrigins?.length ? { cors: { origin: opts.corsOrigins } } : {}),
    // Leave other upgrade requests (e.g. Next.js HMR) alone.
    destroyUpgrade: false,
  });

  // Only queries while rooms are occupied; see sweepRooms.
  setInterval(sweepRooms, SWEEP_INTERVAL_MS).unref();

  io.on("connection", (socket: ClientSocket) => {
    const ctx = () => {
      const room = socket.data.roomId ? rooms.get(socket.data.roomId) : undefined;
      const member = room && socket.data.identity ? room.members.get(socket.data.identity) : undefined;
      return room && member ? { room, member, role: room.roleOf(member) } : null;
    };

    /** Wraps a handler that requires the sender to be an Admin or DJ (or Admin only). */
    const guarded =
      <P,>(adminOnly: boolean, fn: (room: Room, p: P, role: Role) => ErrorCode | void) =>
      (...args: unknown[]) => {
        const last = args[args.length - 1];
        const ack = typeof last === "function" ? (last as Ack) : undefined;
        const payload = (typeof args[0] === "function" ? undefined : args[0]) as P;
        const c = ctx();
        if (!c) return fail(ack, "notInRoom");
        if (adminOnly ? c.role !== "admin" : c.role === "listener") {
          return fail(ack, adminOnly ? "adminOnly" : "controlOnly");
        }
        try {
          const err = fn(c.room, payload, c.role);
          if (err) return fail(ack, err);
          ok(ack);
        } catch (e) {
          console.error("[room] handler failed", e);
          fail(ack, "generic");
        }
      };

    socket.on("time:ping", (ack) => typeof ack === "function" && ack(Date.now()));

    socket.on("room:join", async (payload, ack) => {
      if (typeof ack !== "function") return;
      try {
        const code = String(payload?.code ?? "");
        const clientId = String(payload?.clientId ?? "");
        if (!/^[A-Za-z0-9]{1,32}$/.test(code)) return ack({ ok: false, error: "invalidRoomCode" });
        if (!/^[A-Za-z0-9-]{8,64}$/.test(clientId)) return ack({ ok: false, error: "invalidClient" });
        if (socket.data.roomId) return ack({ ok: false, error: "alreadyInRoom" });

        const room = await loadRoom(io, code.toLowerCase());
        if (!room) return ack({ ok: false, error: "roomNotFound" });

        // Signed-in users present a short-lived token from /api/realtime/token.
        const userId = await verifySocketToken((socket.handshake.auth as { token?: unknown })?.token);
        const user = userId
          ? await prisma.user.findUnique({
              where: { id: userId, status: USER_ACTIVE },
              select: { id: true, username: true, avatarMime: true, updatedAt: true },
            })
          : null;

        const identity = user ? `u:${user.id}` : `c:${clientId}`;
        if (!room.canEnter(identity, clientId, user?.id ?? null)) return ack({ ok: false, error: "roomLocked" });
        const name = user
          ? user.username
          : String(payload?.name ?? "").trim().slice(0, 24) || `Guest-${clientId.slice(0, 4)}`;

        let member = room.members.get(identity);
        if (!member) {
          member = {
            memberId: randomUUID(),
            identity,
            userId: user?.id ?? null,
            clientIds: new Set(),
            name,
            avatarUrl: user ? avatarUrlFor(user) : null,
            sockets: new Set(),
            leaveTimer: null,
          };
          room.members.set(identity, member);
        }
        // Back within the grace period (e.g. a page refresh): keep the same seat.
        if (member.leaveTimer) clearTimeout(member.leaveTimer);
        member.leaveTimer = null;
        member.name = name;
        member.clientIds.add(clientId);
        member.sockets.add(socket.id);
        socket.data.roomId = room.id;
        socket.data.identity = identity;
        if (room.unloadTimer) clearTimeout(room.unloadTimer);
        await socket.join(room.id);
        room.touch();

        ack({ ok: true, memberId: member.memberId, snapshot: room.snapshot(room.roleOf(member) === "admin") });
        room.broadcast();
      } catch (e) {
        console.error("[room] join failed", e);
        ack({ ok: false, error: "joinFailed" });
      }
    });

    socket.on("disconnect", () => {
      const c = ctx();
      if (!c) return;
      const { room, member } = c;
      member.sockets.delete(socket.id);
      if (member.sockets.size > 0) return;
      // Don't drop the member right away: a refresh reconnects within a few seconds,
      // and removing them could empty the room and pause playback for everyone.
      if (member.leaveTimer) clearTimeout(member.leaveTimer);
      member.leaveTimer = setTimeout(() => {
        member.leaveTimer = null;
        if (member.sockets.size > 0 || room.members.get(member.identity) !== member) return;
        room.members.delete(member.identity);
        if (room.members.size === 0) {
          // Nobody is listening: pause so the room resumes where it left off.
          room.pause();
          room.scheduleUnload(() => rooms.delete(room.id));
        } else {
          room.broadcast();
        }
      }, RECONNECT_GRACE_MS);
    });

    // ---- Playback (Admin / DJ) ----
    socket.on("player:play", guarded(false, (room) => room.play()));
    socket.on("player:pause", guarded(false, (room) => room.pause()));
    socket.on("player:next", guarded(false, (room) => room.step(1)));
    socket.on("player:prev", guarded(false, (room) => room.step(-1)));
    socket.on(
      "player:seek",
      guarded(false, (room, p: { position: number }) => {
        const pos = Number(p?.position);
        if (!Number.isFinite(pos) || pos < 0) return "invalidPosition";
        room.seek(pos);
      }),
    );
    socket.on(
      "player:select",
      guarded(false, (room, p: { itemId: string }, role) => {
        // Only the admin can see, and so play, hidden songs.
        if (!room.items.some((i) => i.id === p?.itemId && (role === "admin" || !i.hidden))) return "songNotFound";
        room.setPlayback({ itemId: p.itemId, position: 0, isPlaying: true });
      }),
    );
    socket.on(
      "room:loop",
      guarded(false, (room, p: { mode: LoopMode }) => {
        if (!["none", "one", "all"].includes(p?.mode)) return "invalidLoopMode";
        room.loopMode = p.mode;
        prisma.room.update({ where: { id: room.id }, data: { loopMode: p.mode } }).catch(console.error);
        room.broadcast();
      }),
    );

    // ---- Reports from any listener's player ----
    socket.on("player:ended", (p) => {
      const c = ctx();
      if (c && typeof p?.itemId === "string") c.room.trackEnded(p.itemId);
    });
    socket.on("player:duration", (p) => {
      const c = ctx();
      const duration = Math.round(Number(p?.duration));
      if (!c || !Number.isFinite(duration) || duration <= 0 || duration > 86400) return;
      const item = c.room.items.find((i) => i.id === p?.itemId);
      if (!item || item.durationSec) return;
      item.durationSec = duration;
      prisma.playlistItem.update({ where: { id: item.id }, data: { durationSec: duration } }).catch(console.error);
      if (c.room.playback.itemId === item.id) c.room.setPlayback({ position: c.room.positionNow() });
      else c.room.broadcast();
    });

    // ---- Playlist (Admin / DJ) ----
    /**
     * Appends songs to the playlist (one DB write, one broadcast); starts playback if nothing is selected,
     * or with `play`, plays the first added song right away.
     * Songs from a playlist bring its memos, which only the admin sees.
     */
    async function addSongs(videos: unknown[], ack: Ack | undefined, play = false) {
      const c = ctx();
      if (!c) return fail(ack, "notInRoom");
      if (c.role === "listener") return fail(ack, "controlOnly");
      const parsed = z.array(roomSongSchema).min(1).max(MAX_POST_TRACKS).safeParse(videos);
      if (!parsed.success) return fail(ack, "invalidSong");
      const { room, member } = c;
      if (room.items.length + parsed.data.length > MAX_ROOM_ITEMS) return fail(ack, "playlistFull");
      try {
        const rows = await room.persist(async () => {
          const last = await prisma.playlistItem.findFirst({
            where: { roomId: room.id },
            orderBy: { position: "desc" },
            select: { position: true },
          });
          const start = (last?.position ?? -1) + 1;
          return prisma.playlistItem.createManyAndReturn({
            data: parsed.data.map((v, i) => ({ ...v, roomId: room.id, position: start + i, addedBy: member.name })),
          });
        });
        rows.sort((a, b) => a.position - b.position);
        rows.forEach((row, i) => room.items.push({ ...parsed.data[i], id: row.id, addedBy: row.addedBy }));
        if (play || !room.playback.itemId) room.setPlayback({ itemId: rows[0].id, position: 0, isPlaying: true });
        else room.broadcast();
        ok(ack);
      } catch (e) {
        console.error("[room] add failed", e);
        fail(ack, "addFailed");
      }
    }

    // "Play now" from the search tab adds the song and plays it.
    socket.on("playlist:add", (p, ack) => addSongs([p?.video], ack, p?.play === true));
    // "Add all" / "Add selected" from the Library tab.
    socket.on("playlist:addMany", (p, ack) => addSongs(Array.isArray(p?.videos) ? p.videos : [], ack));

    socket.on("playlist:remove", async (p, ack) => {
      const c = ctx();
      if (!c) return fail(ack, "notInRoom");
      if (c.role === "listener") return fail(ack, "controlOnly");
      const { room } = c;
      if (!room.items.some((i) => i.id === p?.itemId && (c.role === "admin" || !i.hidden))) {
        return fail(ack, "songNotFound");
      }
      try {
        await room.persist(() => prisma.playlistItem.deleteMany({ where: { id: p.itemId, roomId: room.id } }));
      } catch (e) {
        console.error("[room] remove failed", e);
        return fail(ack, "removeFailed");
      }
      // Look it up again: the playlist may have changed while we waited (e.g. removed twice at once).
      const idx = room.items.findIndex((i) => i.id === p.itemId);
      if (idx === -1) return ok(ack);
      room.items.splice(idx, 1);
      if (room.playback.itemId === p.itemId) {
        const next = room.neighbor(idx - 1, 1) ?? (room.loopMode === "all" ? room.firstVisible() : null);
        room.setPlayback(
          next
            ? { itemId: next.id, position: 0 }
            : { itemId: room.neighbor(room.items.length, -1)?.id ?? null, position: 0, isPlaying: false },
        );
      } else {
        room.broadcast();
      }
      ok(ack);
    });

    socket.on("playlist:reorder", async (p, ack) => {
      const c = ctx();
      if (!c) return fail(ack, "notInRoom");
      if (c.role === "listener") return fail(ack, "controlOnly");
      const { room } = c;
      const ids = Array.isArray(p?.orderedIds) ? p.orderedIds : [];
      // DJs don't see hidden songs: they reorder the visible ones, and hidden songs keep their slots.
      const isAdmin = c.role === "admin";
      const movable = isAdmin ? room.items : room.items.filter((i) => !i.hidden);
      const byId = new Map(movable.map((i) => [i.id, i]));
      if (ids.length !== movable.length || new Set(ids).size !== ids.length || !ids.every((id) => byId.has(id))) {
        return fail(ack, "playlistChanged");
      }
      const reordered = ids.map((id) => byId.get(id)!);
      let k = 0;
      room.items = isAdmin ? reordered : room.items.map((i) => (i.hidden ? i : reordered[k++]));
      room.broadcast();
      try {
        // Writes the order at the time this runs, so the last edit always wins in the DB too.
        await room.persist(() =>
          prisma.$transaction(
            room.items.map((item, position) =>
              prisma.playlistItem.updateMany({ where: { id: item.id, roomId: room.id }, data: { position } }),
            ),
          ),
        );
        ok(ack);
      } catch (e) {
        console.error("[room] reorder failed", e);
        fail(ack, "reorderFailed");
      }
    });

    // ---- Admin only ----
    socket.on(
      "room:masterVolume",
      guarded(true, (room, p: { volume: number }) => {
        const v = Math.round(Number(p?.volume));
        if (!Number.isFinite(v) || v < 0 || v > 100) return "invalidVolume";
        room.masterVolume = v;
        prisma.room.update({ where: { id: room.id }, data: { masterVolume: v } }).catch(console.error);
        room.broadcast();
      }),
    );

    // Admin-only memo on a song ("play when the party enters the crypt"). Empty clears it.
    socket.on("playlist:memo", async (p, ack) => {
      const c = ctx();
      if (!c) return fail(ack, "notInRoom");
      if (c.role !== "admin") return fail(ack, "adminOnly");
      const { room } = c;
      const item = room.items.find((i) => i.id === p?.itemId);
      if (!item) return fail(ack, "songNotFound");
      if (typeof p.memo !== "string") return fail(ack, "invalidInput");
      const memo = p.memo.trim();
      if (memo.length > MAX_MEMO) return fail(ack, "memoLong");
      item.memo = memo || null;
      room.broadcast();
      try {
        await room.persist(() =>
          prisma.playlistItem.updateMany({ where: { id: item.id, roomId: room.id }, data: { memo: item.memo } }),
        );
        ok(ack);
      } catch (e) {
        console.error("[room] memo save failed", e);
        fail(ack, "generic");
      }
    });

    // Admin-only: hide a song from everyone else as a surprise. Playing it reveals it (see setPlayback).
    socket.on("playlist:hide", async (p, ack) => {
      const c = ctx();
      if (!c) return fail(ack, "notInRoom");
      if (c.role !== "admin") return fail(ack, "adminOnly");
      const { room } = c;
      const item = room.items.find((i) => i.id === p?.itemId);
      if (!item) return fail(ack, "songNotFound");
      if (typeof p.hidden !== "boolean") return fail(ack, "invalidInput");
      // Everyone can already see (and hear) the selected song.
      if (p.hidden && room.playback.itemId === item.id) return fail(ack, "hideCurrent");
      item.hidden = p.hidden;
      room.broadcast();
      try {
        await room.persist(() =>
          prisma.playlistItem.updateMany({ where: { id: item.id, roomId: room.id }, data: { hidden: item.hidden } }),
        );
        ok(ack);
      } catch (e) {
        console.error("[room] hide failed", e);
        fail(ack, "generic");
      }
    });

    // Admin-only: hide every song but the selected one (it's already in front of everyone), or show them all.
    socket.on("playlist:hideAll", async (p, ack) => {
      const c = ctx();
      if (!c) return fail(ack, "notInRoom");
      if (c.role !== "admin") return fail(ack, "adminOnly");
      if (typeof p?.hidden !== "boolean") return fail(ack, "invalidInput");
      const { room } = c;
      const keep = p.hidden ? room.playback.itemId : null;
      for (const item of room.items) if (item.id !== keep) item.hidden = p.hidden;
      room.broadcast();
      try {
        await room.persist(() =>
          prisma.playlistItem.updateMany({
            where: { roomId: room.id, ...(keep ? { id: { not: keep } } : {}) },
            data: { hidden: p.hidden },
          }),
        );
        ok(ack);
      } catch (e) {
        console.error("[room] hide all failed", e);
        fail(ack, "generic");
      }
    });

    // Admin-only: close the room to newcomers (everyone here now may come back), or open it again.
    socket.on("room:lock", async (p, ack) => {
      const c = ctx();
      if (!c) return fail(ack, "notInRoom");
      if (c.role !== "admin") return fail(ack, "adminOnly");
      if (typeof p?.locked !== "boolean") return fail(ack, "invalidInput");
      const { room } = c;
      const allowed = p.locked ? new Set(room.members.keys()) : new Set<string>();
      try {
        await prisma.room.update({
          where: { id: room.id },
          data: { locked: p.locked, allowedIdentities: [...allowed] },
        });
      } catch (e) {
        console.error("[room] lock failed", e);
        return fail(ack, "generic");
      }
      room.locked = p.locked;
      room.allowed = allowed;
      room.broadcast();
      ok(ack);
    });

    socket.on("member:setRole", async (p, ack) => {
      const c = ctx();
      if (!c) return fail(ack, "notInRoom");
      if (c.role !== "admin") return fail(ack, "adminOnly");
      const { room } = c;
      const target = [...room.members.values()].find((m) => m.memberId === p?.memberId);
      if (!target) return fail(ack, "memberLeft");
      if (room.roleOf(target) === "admin") return fail(ack, "adminRoleFixed");
      if (p.role !== "dj" && p.role !== "listener") return fail(ack, "invalidRole");
      try {
        if (p.role === "dj") {
          await prisma.roomDj.upsert({
            where: { roomId_identity: { roomId: room.id, identity: target.identity } },
            create: { roomId: room.id, identity: target.identity },
            update: {},
          });
          room.djs.add(target.identity);
        } else {
          await prisma.roomDj.deleteMany({ where: { roomId: room.id, identity: target.identity } });
          room.djs.delete(target.identity);
        }
      } catch (e) {
        console.error("[room] setRole failed", e);
        return fail(ack, "roleFailed");
      }
      room.broadcast();
      ok(ack);
    });
  });

  return io;
}
