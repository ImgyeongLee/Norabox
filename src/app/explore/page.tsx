import type { Metadata } from 'next';
import { YouTubeEmbed } from '@/components/forum/YouTubeEmbed';
import { dailyTracks, exploreDay } from '@/lib/explore';
import { formatDuration } from '@/lib/format';
import { getI18n } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
    const { t } = await getI18n();
    return { title: t.meta.explore };
}

/** Explore: today's random songs from Norabox playlists (see src/lib/explore.ts). */
export default async function ExplorePage() {
    const [{ t }, tracks] = await Promise.all([getI18n(), dailyTracks(exploreDay())]);
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
                            <YouTubeEmbed videoId={v.videoId} title={v.title} compact />
                            <p className="mt-2 line-clamp-2 text-sm font-semibold leading-snug">{v.title}</p>
                            <p className="mt-0.5 truncate text-xs text-lime/55">
                                {v.channel}
                                {v.durationSec ? ` · ${formatDuration(v.durationSec)}` : ''}
                            </p>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
