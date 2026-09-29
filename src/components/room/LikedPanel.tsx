'use client';

/* eslint-disable @next/next/no-img-element -- YouTube thumbnails */
import { useEffect, useState } from 'react';
import { useI18n } from '@/i18n/client';
import { formatDuration } from '@/lib/format';
import type { ImportablePlaylist } from '@/lib/playlist-types';
import { scenarioKey, type Video } from '@/lib/validation';

type Props = {
    canControl: boolean;
    signedIn: boolean;
    /** Video ids already in the room's playlist, shown as "Add again". */
    addedIds: Set<string>;
    onAdd: (videos: Video[]) => Promise<boolean>;
};

type ItemProps = Omit<Props, 'signedIn'> & { playlist: ImportablePlaylist };

/** True if every word of the query appears in the playlist's title, scenario, writer or author. */
function matches(p: ImportablePlaylist, query: string) {
    const haystack = scenarioKey([p.title, p.scenario?.name, p.scenario?.writer, p.author].filter(Boolean).join(' '));
    return scenarioKey(query)
        .split(' ')
        .every((word) => haystack.includes(word));
}

/**
 * The room's Liked tab (a signed-in benefit): the user's liked forum playlists,
 * searchable, with "Add" per song and "Add all".
 */
export function LikedPanel({ canControl, signedIn, addedIds, onAdd }: Props) {
    const { t } = useI18n();
    const [playlists, setPlaylists] = useState<ImportablePlaylist[] | null>(null);
    const [query, setQuery] = useState('');

    useEffect(() => {
        if (!signedIn) return;
        let stale = false;
        fetch('/api/me/likes', { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : { playlists: [] }))
            .catch(() => ({ playlists: [] }))
            .then((d: { playlists: ImportablePlaylist[] }) => !stale && setPlaylists(d.playlists));
        return () => {
            stale = true;
        };
    }, [signedIn]);

    if (!signedIn) return <p className="text-sm text-lime/60">{t.likedTab.loginRequired}</p>;
    if (playlists === null) return <p className="text-sm text-lime/50">{t.likedTab.loading}</p>;
    if (playlists.length === 0) {
        return (
            <p className="text-sm text-lime/55">
                {t.likedTab.empty}{' '}
                {/* New tab, so the music in this room keeps playing. */}
                <a href="/forum" target="_blank" rel="noopener" className="font-semibold text-moss hover:underline">
                    {t.likedTab.openForum} ↗
                </a>
            </p>
        );
    }

    const shown = query.trim() ? playlists.filter((p) => matches(p, query)) : playlists;
    return (
        <div className="space-y-3">
            {!canControl && <p className="text-sm text-lime/60">{t.room.searchDenied}</p>}
            <input
                type="search"
                className="input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.likedTab.searchPlaceholder}
                aria-label={t.likedTab.searchLabel}
            />
            {shown.length === 0 ? (
                <p className="text-sm text-lime/55">{t.likedTab.noMatch}</p>
            ) : (
                <ul className="space-y-2">
                    {shown.map((p) => (
                        <PlaylistItem key={p.id} playlist={p} canControl={canControl} addedIds={addedIds} onAdd={onAdd} />
                    ))}
                </ul>
            )}
        </div>
    );
}

function PlaylistItem({ playlist: p, canControl, addedIds, onAdd }: ItemProps) {
    const { t } = useI18n();
    const [open, setOpen] = useState(false);
    const [pending, setPending] = useState<string | null>(null);

    async function add(key: string, videos: Video[]) {
        setPending(key);
        await onAdd(videos);
        setPending(null);
    }

    return (
        <li className="rounded-xl bg-pine/40 p-3">
            <div className="flex items-start gap-3">
                <button
                    type="button"
                    onClick={() => setOpen((o) => !o)}
                    aria-expanded={open}
                    aria-label={open ? t.likedTab.hideSongs : t.likedTab.showSongs}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                >
                    {p.tracks[0] && (
                        <img src={p.tracks[0].thumbnail} alt="" className="aspect-video w-20 shrink-0 rounded-md object-cover" />
                    )}
                    <span className="min-w-0">
                        <span className="line-clamp-2 text-sm font-semibold leading-snug">{p.title}</span>
                        <span className="mt-0.5 block truncate text-xs text-lime/55">
                            {p.scenario ? `${p.scenario.name}${p.scenario.writer ? ` · ${p.scenario.writer}` : ''} · ` : ''}
                            {t.common.songs(p.tracks.length)} {open ? '▴' : '▾'}
                        </span>
                    </span>
                </button>
                <button
                    type="button"
                    className="btn-secondary shrink-0 px-2.5 py-1.5 text-xs"
                    disabled={!canControl || pending !== null || p.tracks.length === 0}
                    onClick={() => add('all', p.tracks)}
                >
                    {pending === 'all' ? '…' : t.likedTab.addAll}
                </button>
            </div>
            {open && (
                <ul className="mt-3 divide-y divide-leaf/25 border-t border-leaf/25">
                    {p.tracks.map((v, i) => {
                        const key = `${i}:${v.videoId}`;
                        const added = addedIds.has(v.videoId);
                        return (
                            <li key={key} className="flex items-center gap-2 py-2">
                                <span className="w-5 shrink-0 text-center font-mono text-[11px] text-lime/40">{i + 1}</span>
                                <span className="min-w-0 flex-1">
                                    <span className="line-clamp-1 text-sm">{v.title}</span>
                                    <span className="block truncate text-xs text-lime/50">
                                        {v.channel} · {formatDuration(v.durationSec)}
                                    </span>
                                </span>
                                <button
                                    type="button"
                                    className={`${added ? 'btn-ghost' : 'btn-secondary'} shrink-0 px-2.5 py-1.5 text-xs`}
                                    disabled={!canControl || pending !== null}
                                    onClick={() => add(key, [v])}
                                    aria-label={t.search.addLabel(v.title)}
                                >
                                    {pending === key ? '…' : added ? t.search.addAgain : t.search.add}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </li>
    );
}
