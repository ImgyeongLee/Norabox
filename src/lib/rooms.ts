import { shownTheme } from "@/lib/limited-themes";
import { prisma } from "@/lib/prisma";
import { isRoomTheme, type RoomTheme } from "@/lib/room-themes";

/** A room with nobody in it and no changes for this long is deleted. */
export const ROOM_INACTIVE_TTL_MS = 6 * 60 * 60 * 1000;

export const inactiveCutoff = () => new Date(Date.now() - ROOM_INACTIVE_TTL_MS);

/**
 * Deletes the room if it has been inactive past the TTL (playlist and DJs cascade).
 * Called before every lookup, so expiry holds even while the realtime server's
 * periodic sweep isn't running (e.g. a sleeping free-tier instance).
 */
export async function purgeIfExpired(slug: string) {
  await prisma.room.deleteMany({ where: { slug, lastActiveAt: { lt: inactiveCutoff() } } });
}

/** A room its owner can go back to, for the home page's "your rooms are still open" card. */
export type OwnRoom = { code: string; theme: RoomTheme; lastActiveAt: string };

/** At most this many rooms in that card, most recently active first. */
export const MAX_OWN_ROOMS = 5;

/**
 * Rooms made by this account or this browser that haven't expired yet. A room remembers who made it
 * (ownerUserId for members, ownerClientId, the browser's secret client id, for everyone), so a
 * member also sees rooms made on another device. Limited themes that have ended show as default.
 */
export async function liveRoomsOwnedBy(owner: { userId?: string | null; clientId?: string | null }): Promise<OwnRoom[]> {
  const who = [
    ...(owner.userId ? [{ ownerUserId: owner.userId }] : []),
    ...(owner.clientId ? [{ ownerClientId: owner.clientId }] : []),
  ];
  if (who.length === 0) return [];
  const rooms = await prisma.room.findMany({
    where: { OR: who, lastActiveAt: { gte: inactiveCutoff() } },
    orderBy: { lastActiveAt: "desc" },
    take: MAX_OWN_ROOMS,
    select: { code: true, theme: true, lastActiveAt: true },
  });
  return rooms.map((r) => ({
    code: r.code,
    theme: isRoomTheme(r.theme) ? shownTheme(r.theme) : "default",
    lastActiveAt: r.lastActiveAt.toISOString(),
  }));
}
