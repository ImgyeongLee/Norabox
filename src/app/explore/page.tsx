import type { Metadata } from 'next';
import { ExploreSongAdmin, HiddenExploreSongs } from '@/components/explore/ExploreAdmin';
import { YouTubeEmbed } from '@/components/forum/YouTubeEmbed';
import { getCurrentUser } from '@/lib/auth';
import { dailyTracks, exploreDay, hiddenSongs, songAdders } from '@/lib/explore';
import { formatDuration } from '@/lib/format';
import { isSiteAdmin } from '@/lib/site-admin';
import { getI18n } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
    const { t } = await getI18n();
    return { title: t.meta.explore };
}

/**
 * Explore: today's random songs from Norabox playlists (see src/lib/explore.ts). The site admin
 * also sees who added each song, and can blur its thumbnail or swap it for another song.
 */
export default async function ExplorePage() {
    const [{ t }, tracks, user] = await Promise.all([getI18n(), dailyTracks(exploreDay()), getCurrentUser()]);
    const admin = isSiteAdmin(user);
    const [adders, hidden] = admin
        ? await Promise.all([songAdders(tracks.map((v) => v.videoId)), hiddenSongs()])
        : [{} as Record<string, string[]>, []];
    return (
        <div className="mx-auto max-w-6xl px-4 py-10">
            <h1 className="text-3xl font-bold">{t.explore.title}</h1>
            <p className="muted mt-1">{t.explore.lead}</p>
            {tracks.length === 0 ? (
                <p className="mt-16 text-center text-lime/55">{t.explore.empty}</p>
            ) : (
                <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {tracks.map((v) => (
                        <li key={v.videoId} className="card p-3">
                            {/* Keyed by `blurred` so a change by the admin resets the "shown" state. */}
                            <YouTubeEmbed
                                key={String(v.blurred)}
                                videoId={v.videoId}
                                title={v.title}
                                compact
                                blurred={v.blurred}
                            />
                            <p className="mt-2 line-clamp-2 text-sm font-semibold leading-snug">{v.title}</p>
                            <p className="mt-0.5 truncate text-xs text-lime/55">
                                {v.channel}
                                {v.durationSec ? ` · ${formatDuration(v.durationSec)}` : ''}
                            </p>
                            {admin && (
                                <ExploreSongAdmin videoId={v.videoId} blurred={v.blurred} adders={adders[v.videoId] ?? []} />
                            )}
                        </li>
                    ))}
                </ul>
            )}
            {admin && <HiddenExploreSongs songs={hidden} />}
        </div>
    );
}
