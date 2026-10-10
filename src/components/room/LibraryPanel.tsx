'use client';

/* eslint-disable @next/next/no-img-element -- YouTube thumbnails */
import { useEffect, useState } from 'react';
import { LuArrowUpDown, LuCheck, LuChevronDown, LuChevronUp, LuExternalLink, LuPlus } from 'react-icons/lu';
import { Icon } from '@/components/icons';
import { Playlist } from '@/components/room/Playlist';
import { useI18n } from '@/i18n/client';
import { formatDuration } from '@/lib/format';
import type { ImportablePlaylist } from '@/lib/playlist-types';
import { scenarioKey, type RoomSong } from '@/lib/validation';

type Props = {
    canControl: boolean;
    signedIn: boolean;
    /** Video ids already in the room's playlist, marked "In room". */
    addedIds: Set<string>;
    /** Adds songs to the room; songs from the user's own playlists carry their memos. */
    onAdd: (videos: RoomSong[]) => Promise<boolean>;
    /** Shows an error as the room's toast. */
    onMessage: (text: string) => void;
};

type ItemProps = Omit<Props, 'signedIn' | 'onMessage'> & {
    playlist: ImportablePlaylist;
    /** Set for the user's own playlists: saves a new song order. */
    onReorder?: (playlistId: string, orderedIds: string[]) => void;
};
type Library = { mine: ImportablePlaylist[]; liked: ImportablePlaylist[] };

/** True if every word of the query appears in the playlist's title, scenario, writer or author. */
function matches(p: ImportablePlaylist, query: string) {
    const haystack = scenarioKey([p.title, p.scenario?.name, p.scenario?.writer, p.author].filter(Boolean).join(' '));
    return scenarioKey(query)
        .split(' ')
        .every((word) => haystack.includes(word));
}

/**
 * The room's Library tab (for signed-in users): their own playlists and the ones they
 * liked, searchable. Each can be added whole, or unrolled to pick individual songs.
 * Their own playlists can also be reordered right here.
 */
export function LibraryPanel({ canControl, signedIn, addedIds, onAdd, onMessage }: Props) {
    const { t, tError } = useI18n();
    const [library, setLibrary] = useState<Library | null>(null);
    const [query, setQuery] = useState('');

    useEffect(() => {
        if (!signedIn) return;
        let stale = false;
        fetch('/api/me/library', { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : { mine: [], liked: [] }))
            .catch(() => ({ mine: [], liked: [] }))
            .then((d: Library) => !stale && setLibrary(d));
        return () => {
            stale = true;
        };
    }, [signedIn]);

    /** Reorders one of the user's playlists: shown at once, saved in the background. */
    async function reorder(playlistId: string, orderedIds: string[]) {
        const before = library;
        const apply = (p: ImportablePlaylist) =>
            p.id === playlistId ? { ...p, tracks: orderedIds.map((id) => p.tracks.find((tr) => tr.id === id)!) } : p;
        // A user can like their own playlist, so it may be in both lists.
        setLibrary((l) => l && { mine: l.mine.map(apply), liked: l.liked.map(apply) });
        try {
            const res = await fetch(`/api/posts/${playlistId}/tracks`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderedIds }),
            });
            if (!res.ok) throw new Error((await res.json()).error);
        } catch (e) {
            setLibrary(before);
            onMessage(tError(e instanceof Error ? e.message : 'network'));
        }
    }

    if (!signedIn) return <p className="text-sm text-lime/60">{t.likedTab.loginRequired}</p>;
    if (library === null) return <p className="text-sm text-lime/50">{t.likedTab.loading}</p>;

    const filter = (list: ImportablePlaylist[]) => (query.trim() ? list.filter((p) => matches(p, query)) : list);
    const mine = filter(library.mine);
    const liked = filter(library.liked);
    const searching = query.trim() !== '';
    const itemProps = { canControl, addedIds, onAdd };

    return (
        <div className="space-y-5">
            {!canControl && <p className="text-sm text-lime/60">{t.room.searchDenied}</p>}
            <input
                type="search"
                className="input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.likedTab.searchPlaceholder}
                aria-label={t.likedTab.searchLabel}
            />
            {searching && mine.length === 0 && liked.length === 0 ? (
                <p className="text-sm text-lime/55">{t.likedTab.noMatch}</p>
            ) : (
                <>
                    <Section title={t.likedTab.mine} count={mine.length} hideWhenEmpty={searching}>
                        {library.mine.length === 0 ? (
                            <p className="text-sm text-lime/55">{t.likedTab.mineEmpty}</p>
                        ) : (
                            mine.map((p) => <PlaylistItem key={p.id} playlist={p} {...itemProps} onReorder={reorder} />)
                        )}
                    </Section>
                    <Section title={t.likedTab.liked} count={liked.length} hideWhenEmpty={searching}>
                        {library.liked.length === 0 ? (
                            <p className="text-sm text-lime/55">
                                {t.likedTab.empty}{' '}
                                {/* New tab, so the music in this room keeps playing. */}
                                <a href="/forum" target="_blank" rel="noopener" className="font-semibold text-moss hover:underline">
                                    {t.likedTab.openForum}
                                    <Icon as={LuExternalLink} className="ml-1 inline size-3.5 align-[-2px]" />
                                </a>
                            </p>
                        ) : (
                            liked.map((p) => <PlaylistItem key={p.id} playlist={p} {...itemProps} />)
                        )}
                    </Section>
                </>
            )}
        </div>
    );
}

function Section({
    title,
    count,
    hideWhenEmpty,
    children,
}: {
    title: string;
    count: number;
    hideWhenEmpty: boolean;
    children: React.ReactNode;
}) {
    if (hideWhenEmpty && count === 0) return null;
    return (
        <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-lime/50">
                {title} <span className="font-mono">({count})</span>
            </h3>
            <ul className="space-y-2">{children}</ul>
        </section>
    );
}

function PlaylistItem({ playlist: p, canControl, addedIds, onAdd, onReorder }: ItemProps) {
    const { t } = useI18n();
    const [view, setView] = useState<'closed' | 'choose' | 'reorder'>('closed');
    const open = view === 'choose';
    const [selected, setSelected] = useState<Set<number>>(() => new Set());
    const [pending, setPending] = useState(false);

    const allSelected = selected.size === p.tracks.length && p.tracks.length > 0;

    function toggle(i: number) {
        setSelected((s) => {
            const next = new Set(s);
            if (next.has(i)) next.delete(i);
            else next.add(i);
            return next;
        });
    }

    async function add(videos: RoomSong[]) {
        setPending(true);
        const ok = await onAdd(videos);
        setPending(false);
        if (ok) setSelected(new Set());
    }

    return (
        <li className="rounded-xl bg-pine/40 p-3">
            <div className="flex items-start gap-3">
                {p.tracks[0] && (
                    <img src={p.tracks[0].thumbnail} alt="" className="aspect-video w-20 shrink-0 rounded-md object-cover" />
                )}
                <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold leading-snug">{p.title}</p>
                    <p className="mt-0.5 truncate text-xs text-lime/55">
                        {p.scenario ? `${p.scenario.name}${p.scenario.writer ? ` · ${p.scenario.writer}` : ''} · ` : ''}
                        {t.common.songs(p.tracks.length)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        <button
                            type="button"
                            onClick={() => setView(open ? 'closed' : 'choose')}
                            aria-expanded={open}
                            className="btn-ghost gap-1 px-2 py-1 text-xs"
                        >
                            <Icon as={open ? LuChevronUp : LuChevronDown} className="size-3.5" />
                            {open ? t.likedTab.hideSongs : t.likedTab.chooseSongs}
                        </button>
                        <button
                            type="button"
                            className="btn-secondary gap-1 px-2 py-1 text-xs"
                            disabled={!canControl || pending || p.tracks.length === 0}
                            onClick={() => add(p.tracks)}
                        >
                            <Icon as={LuPlus} className="size-3.5" />
                            {t.likedTab.addAll}
                        </button>
                        {onReorder && p.tracks.length > 1 && (
                            <button
                                type="button"
                                onClick={() => setView(view === 'reorder' ? 'closed' : 'reorder')}
                                aria-expanded={view === 'reorder'}
                                className="btn-ghost gap-1 px-2 py-1 text-xs"
                            >
                                <Icon as={LuArrowUpDown} className="size-3.5" />
                                {view === 'reorder' ? t.likedTab.doneReorder : t.likedTab.reorder}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {view === 'reorder' && onReorder && (
                <div className="mt-3 border-t border-leaf/25 pt-2">
                    <p className="mb-2 px-1 text-xs text-lime/45">{t.likedTab.reorderHint}</p>
                    <Playlist items={p.tracks} editable onReorder={(ids) => onReorder(p.id, ids)} />
                </div>
            )}

            {open && (
                <div className="mt-3 border-t border-leaf/25 pt-2">
                    <label className="flex cursor-pointer items-center gap-2 px-1 py-1.5 text-xs text-lime/70">
                        <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={() => setSelected(allSelected ? new Set() : new Set(p.tracks.map((_, i) => i)))}
                            className="size-4 accent-[var(--color-moss)]"
                        />
                        {t.likedTab.selectAll}
                    </label>
                    <ul className="divide-y divide-leaf/20">
                        {p.tracks.map((v, i) => (
                            <li key={`${i}:${v.videoId}`}>
                                <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-2 hover:bg-fern/40">
                                    <input
                                        type="checkbox"
                                        checked={selected.has(i)}
                                        onChange={() => toggle(i)}
                                        className="size-4 shrink-0 accent-[var(--color-moss)]"
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span className="line-clamp-1 text-sm">{v.title}</span>
                                        <span className="block truncate text-xs text-lime/50">
                                            {v.channel} · {formatDuration(v.durationSec)}
                                        </span>
                                    </span>
                                    {addedIds.has(v.videoId) && (
                                        <span className="inline-flex shrink-0 items-center gap-0.5 text-[11px] text-moss">
                                            <Icon as={LuCheck} className="size-3" />
                                            {t.likedTab.inRoom}
                                        </span>
                                    )}
                                </label>
                            </li>
                        ))}
                    </ul>
                    <div className="sticky bottom-0 mt-2 flex justify-end bg-gradient-to-t from-pine/90 pt-2">
                        <button
                            type="button"
                            className="btn-primary px-3 py-2 text-sm"
                            disabled={!canControl || pending || selected.size === 0}
                            onClick={() => add(p.tracks.filter((_, i) => selected.has(i)))}
                        >
                            {pending ? '…' : t.likedTab.addSelected(selected.size)}
                        </button>
                    </div>
                </div>
            )}
        </li>
    );
}
