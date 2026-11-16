import { prisma } from '@/lib/prisma';

// Members who haven't confirmed their email (accounts made before confirmation was required) make
// one playlist a day, Korea time. The time of the last one is kept on the account rather than
// counted from playlists, which can be deleted and would then free the slot again.

const HOUR = 60 * 60 * 1000;

/** Midnight (KST) at the start of the Korean day `now` falls in. */
export function kstDayStart(now: Date) {
    const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(now).split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d) - 9 * HOUR);
}

export type DailyClaim = { ok: true; release: () => Promise<void> } | { ok: false };

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
