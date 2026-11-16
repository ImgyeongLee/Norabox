import { UNVERIFIED_DAILY_ROOMS } from '@/lib/limits';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/rate-limit';

// Daily limits (Korea time) for people whose email isn't confirmed:
// - Rooms: guests and unconfirmed members make UNVERIFIED_DAILY_ROOMS a day. Guests are counted by
//   IP address; unconfirmed members by account and by IP, so logging out doesn't give them more.
//   Counted in Upstash Redis; without Redis (local dev), or if it can't be reached, there's no limit.
// - Playlists: unconfirmed members make one a day. The time of the last one is kept on the account
//   rather than counted from playlists, which can be deleted and would then free the slot again.

const HOUR = 60 * 60 * 1000;

/** Midnight (KST) at the start of the Korean day `now` falls in. */
export function kstDayStart(now: Date) {
    const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(now).split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d) - 9 * HOUR);
}

const kstDate = (now: Date) => new Date(kstDayStart(now).getTime() + 9 * HOUR).toISOString().slice(0, 10);

export type DailyClaim = { ok: true; release: () => Promise<void> } | { ok: false };
const unlimited: DailyClaim = { ok: true, release: async () => {} };

/**
 * Takes one of today's rooms for a guest (`userId` null) or an unconfirmed member; `ok: false` if
 * the limit is reached. Call `release` if the room then isn't made after all.
 */
export async function claimRoom(userId: string | null, ip: string, now = new Date()): Promise<DailyClaim> {
    if (!redis) return unlimited;
    const day = kstDate(now);
    const keys = [`norabox:rooms:ip:${ip}:${day}`, ...(userId ? [`norabox:rooms:u:${userId}:${day}`] : [])];
    const counted: string[] = [];
    const release = async () => {
        await Promise.all(counted.map((k) => redis!.decr(k).catch(() => {})));
    };
    try {
        for (const key of keys) {
            const n = await redis.incr(key);
            counted.push(key);
            if (n === 1) await redis.expire(key, 2 * 24 * 60 * 60);
            if (n > UNVERIFIED_DAILY_ROOMS) {
                await release();
                return { ok: false };
            }
        }
        return { ok: true, release };
    } catch (e) {
        // An outage there shouldn't stop people from making rooms.
        console.error('[limits] room count failed', e);
        await release();
        return unlimited;
    }
}

/** Takes today's one playlist for an unconfirmed member; `ok: false` if it's already used. */
export async function claimPlaylist(userId: string, now = new Date()): Promise<DailyClaim> {
    const before = await prisma.user.findUnique({ where: { id: userId }, select: { lastPlaylistCreatedAt: true } });
    const previous = before?.lastPlaylistCreatedAt ?? null;
    // Checked and taken in one update, so two requests at once can't both get it.
    const { count } = await prisma.user.updateMany({
        where: {
            id: userId,
            OR: [{ lastPlaylistCreatedAt: null }, { lastPlaylistCreatedAt: { lt: kstDayStart(now) } }],
        },
        data: { lastPlaylistCreatedAt: now },
    });
    if (count === 0) return { ok: false };
    return {
        ok: true,
        release: async () => {
            await prisma.user.updateMany({
                where: { id: userId, lastPlaylistCreatedAt: now },
                data: { lastPlaylistCreatedAt: previous },
            });
        },
    };
}

/** Runs `create`, giving the day's slot back if it fails (e.g. the room name was just taken). */
export async function withDailyClaim<T>(claim: DailyClaim & { ok: true }, create: () => Promise<T>) {
    try {
        return await create();
    } catch (e) {
        await claim.release();
        throw e;
    }
}
