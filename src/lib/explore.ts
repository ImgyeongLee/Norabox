import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { USER_ACTIVE } from '@/lib/users';
import type { Video } from '@/lib/validation';

export const EXPLORE_COUNT = 30;

/** Today's date in Korea (YYYY-MM-DD): Explore picks new songs at midnight KST. */
export const exploreDay = (now = new Date()) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(now);

/**
 * EXPLORE_COUNT random songs from every playlist, whatever its visibility: only the songs, never
 * their playlist, author or memo. Shuffled by a hash of each video id and the day, so everyone
 * gets the same picks all day without storing them. Each song counts once however many playlists
 * have it; deleted accounts' songs are left out.
 */
const pick = (day: string) => prisma.$queryRaw<Video[]>`
    select "videoId", title, channel, thumbnail, "durationSec"
    from (
        select distinct on (t."videoId") t."videoId", t.title, t.channel, t.thumbnail, t."durationSec"
        from "PostTrack" t
        join "Post" p on p.id = t."postId"
        join "User" u on u.id = p."authorId"
        where u.status = ${USER_ACTIVE}
        order by t."videoId", t.id
    ) songs
    order by md5(songs."videoId" || ${day})
    limit ${EXPLORE_COUNT}`;

/** Today's picks, cached for the day: the database is asked about once a day, not per visit. */
export const dailyTracks = (day: string) =>
    unstable_cache(() => pick(day), ['explore', day], { revalidate: 60 * 60 * 24 })();
