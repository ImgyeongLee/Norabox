import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { USER_ACTIVE } from '@/lib/users';
import type { Video } from '@/lib/validation';

export const EXPLORE_COUNT = 30;
/** Cache tag of the day's picks, refreshed when the site admin blurs or swaps out a song. */
export const EXPLORE_TAG = 'explore';

/** What the site admin can do to a song on Explore (stored in ExploreSong). */
export const EXPLORE_ACTIONS = ['blur', 'hide'] as const;
export type ExploreAction = (typeof EXPLORE_ACTIONS)[number];

export type ExploreTrack = Video & { blurred: boolean };

/** Today's date in Korea (YYYY-MM-DD): Explore picks new songs at midnight KST. */
export const exploreDay = (now = new Date()) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(now);

/**
 * EXPLORE_COUNT random songs from every playlist, whatever its visibility: only the songs, never
 * their playlist, author or memo. Shuffled by a hash of each video id and the day, so everyone
 * gets the same picks all day without storing them. Each song counts once however many playlists
 * have it; deleted accounts' songs are left out, and so are songs the site admin took out (the
 * next song in the shuffle takes their place). `blurred`: the admin hid its thumbnail.
 */
const pick = (day: string) => prisma.$queryRaw<ExploreTrack[]>`
    select songs.*, coalesce(e.action = 'blur', false) as blurred
    from (
        select distinct on (t."videoId") t."videoId", t.title, t.channel, t.thumbnail, t."durationSec"
        from "PostTrack" t
        join "Post" p on p.id = t."postId"
        join "User" u on u.id = p."authorId"
        where u.status = ${USER_ACTIVE}
        order by t."videoId", t.id
    ) songs
    left join "ExploreSong" e on e."videoId" = songs."videoId"
    where e.action is distinct from 'hide'
    order by md5(songs."videoId" || ${day})
    limit ${EXPLORE_COUNT}`;

/** Today's picks, cached for the day: the database is asked about once a day, not per visit. */
export const dailyTracks = (day: string) =>
    unstable_cache(() => pick(day), ['explore', day], { revalidate: 60 * 60 * 24, tags: [EXPLORE_TAG] })();

/** For the site admin: who put each song in a playlist (usernames, by video id). Not cached. */
export async function songAdders(videoIds: string[]) {
    const rows = await prisma.postTrack.findMany({
        where: { videoId: { in: videoIds }, post: { author: { status: USER_ACTIVE } } },
        select: { videoId: true, post: { select: { author: { select: { username: true } } } } },
    });
    const out: Record<string, string[]> = {};
    for (const { videoId, post } of rows) {
        const names = (out[videoId] ??= []);
        if (!names.includes(post.author.username)) names.push(post.author.username);
    }
    for (const names of Object.values(out)) names.sort((a, b) => a.localeCompare(b));
    return out;
}

/** For the site admin: the songs taken out of Explore, newest first, so they can be put back. */
export const hiddenSongs = () =>
    prisma.exploreSong.findMany({
        where: { action: 'hide' },
        orderBy: { createdAt: 'desc' },
        select: { videoId: true, title: true },
    });
