import { prisma } from "@/lib/prisma";

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
