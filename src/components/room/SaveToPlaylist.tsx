'use client';

import { useState } from 'react';
import { LuCheck, LuExternalLink, LuListPlus, LuX } from 'react-icons/lu';
import { Icon } from '@/components/icons';
import { useI18n } from '@/i18n/client';
import { MAX_POST_TRACKS } from '@/lib/limits';
import type { ImportablePlaylist } from '@/lib/playlist-types';
import type { Video } from '@/lib/validation';

type Props = {
    video: Video;
    /** Shows the result (or an error) as the room's toast. */
    onMessage: (text: string) => void;
};

/**
 * "Add to my playlist" in a room song's "⋯" menu: a button, and a panel under it
 * listing the signed-in user's playlists. Picking one appends the song to it.
 */
export function SaveToPlaylist({ video, onMessage }: Props) {
    const { t, tError } = useI18n();
    const [open, setOpen] = useState(false);
    const [playlists, setPlaylists] = useState<ImportablePlaylist[] | null>(null);
    const [pending, setPending] = useState<string | null>(null);

    async function toggle() {
        if (open) return setOpen(false);
        setOpen(true);
        // Fetched on every open, so playlists edited in another tab show up.
        setPlaylists(null);
        try {
            const res = await fetch('/api/me/library?scope=mine', { cache: 'no-store' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setPlaylists(data.mine);
        } catch (e) {
            setOpen(false);
            onMessage(tError(e instanceof Error ? e.message : 'network'));
        }
    }

    async function save(p: ImportablePlaylist) {
        setPending(p.id);
        try {
            const res = await fetch(`/api/posts/${p.id}/tracks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(video),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setPlaylists((list) => list?.map((x) => (x.id === p.id ? { ...x, tracks: [...x.tracks, data.track] } : x)) ?? null);
            onMessage(t.saveTo.added(p.title));
            setOpen(false);
        } catch (e) {
            onMessage(tError(e instanceof Error ? e.message : 'network'));
        } finally {
            setPending(null);
        }
    }

    return (
        <>
            <button
                type="button"
                onClick={toggle}
                aria-expanded={open}
                title={t.playlist.saveToMine(video.title)}
                className={`btn-ghost gap-1 px-2 py-1 text-xs ${open ? 'text-lime' : ''}`}>
                <Icon as={LuListPlus} className="size-3.5" />
                {t.saveTo.title}
            </button>
            {open && (
                <div className="order-last basis-full rounded-lg border border-leaf/30 bg-pine/60 p-2">
                    <div className="mb-1 flex items-center justify-between gap-2 px-1">
                        <p className="text-xs font-semibold text-lime/70">{t.saveTo.title}</p>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="icon-btn size-6 text-lime/40 hover:text-lime"
                            aria-label={t.saveTo.close}>
                            <Icon as={LuX} className="size-3.5" />
                        </button>
                    </div>
                    {playlists === null ? (
                        <p className="px-1 py-1.5 text-xs text-lime/50">{t.saveTo.loading}</p>
                    ) : playlists.length === 0 ? (
                        <p className="px-1 py-1.5 text-xs text-lime/55">
                            {t.saveTo.empty}{' '}
                            {/* New tab, so the music in this room keeps playing. */}
                            <a
                                href="/playlists/new"
                                target="_blank"
                                rel="noopener"
                                className="font-semibold text-moss hover:underline">
                                {t.saveTo.create}
                                <Icon as={LuExternalLink} className="ml-1 inline size-3 align-[-2px]" />
                            </a>
                        </p>
                    ) : (
                        <ul className="max-h-48 space-y-0.5 overflow-y-auto">
                            {playlists.map((p) => {
                                const has = p.tracks.some((tr) => tr.videoId === video.videoId);
                                const full = p.tracks.length >= MAX_POST_TRACKS;
                                return (
                                    <li key={p.id}>
                                        <button
                                            type="button"
                                            onClick={() => save(p)}
                                            disabled={has || full || pending !== null}
                                            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-fern/50 disabled:cursor-default disabled:hover:bg-transparent">
                                            <span className="min-w-0 flex-1 truncate">{p.title}</span>
                                            <span className="shrink-0 text-[11px] text-lime/45">
                                                {pending === p.id ? (
                                                    '…'
                                                ) : has ? (
                                                    <span className="inline-flex items-center gap-0.5 text-moss">
                                                        <Icon as={LuCheck} className="size-3" />
                                                        {t.saveTo.inPlaylist}
                                                    </span>
                                                ) : full ? (
                                                    t.saveTo.full
                                                ) : (
                                                    t.common.songs(p.tracks.length)
                                                )}
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            )}
        </>
    );
}
