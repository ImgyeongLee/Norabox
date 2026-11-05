'use client';

import { useEffect, useState } from 'react';
import { LuCheck, LuListPlus, LuPlus, LuX } from 'react-icons/lu';
import { Icon } from '@/components/icons';
import { useI18n } from '@/i18n/client';
import { MAX_POST_TRACKS } from '@/lib/limits';
import type { ImportablePlaylist } from '@/lib/playlist-types';
import type { RoomSong } from '@/lib/validation';

type Props = {
    /** The room song; its memo (only the admin's copy has one) comes along into the playlist. */
    video: RoomSong;
    /** Shows the result (or an error) as the room's toast. */
    onMessage: (text: string) => void;
};

/**
 * "Add to my playlist" in a room song's "⋯" menu: a button, and a PlaylistPicker under it.
 */
export function SaveToPlaylist({ video, onMessage }: Props) {
    const { t } = useI18n();
    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                title={t.playlist.saveToMine(video.title)}
                className={`btn-ghost gap-1 px-2 py-1 text-xs ${open ? 'text-lime' : ''}`}>
                <Icon as={LuListPlus} className="size-3.5" />
                {t.saveTo.title}
            </button>
            {open && (
                <PlaylistPicker
                    videos={[video]}
                    onSaved={() => setOpen(false)}
                    onClose={() => setOpen(false)}
                    onMessage={onMessage}
                    className="order-last basis-full"
                />
            )}
        </>
    );
}

async function send(url: string, body: unknown) {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
}

/**
 * A panel listing the signed-in user's playlists: picking one appends `videos` to it (songs it
 * already has are skipped), or "New playlist" makes a private playlist with them.
 */
export function PlaylistPicker({
    videos,
    onSaved,
    onClose,
    onMessage,
    className = '',
}: {
    videos: RoomSong[];
    onSaved: () => void;
    /** The close button, or the playlists failed to load. */
    onClose: () => void;
    onMessage: (text: string) => void;
    className?: string;
}) {
    const { t, tError } = useI18n();
    const [playlists, setPlaylists] = useState<ImportablePlaylist[] | null>(null);
    const [pending, setPending] = useState<string | null>(null);
    const [newTitle, setNewTitle] = useState<string | null>(null); // null = "New playlist" not opened
    const tooMany = videos.length > MAX_POST_TRACKS;

    // Fetched on every open, so playlists edited in another tab show up.
    useEffect(() => {
        let stale = false;
        fetch('/api/me/library?scope=mine', { cache: 'no-store' })
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                if (!stale) setPlaylists(data.mine);
            })
            .catch((e) => {
                if (stale) return;
                onMessage(tError(e instanceof Error ? e.message : 'network'));
                onClose();
            });
        return () => {
            stale = true;
        };
        // Only on open: the callbacks are new on every render of the room.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function save(p: ImportablePlaylist) {
        setPending(p.id);
        try {
            const { tracks } = await send(`/api/posts/${p.id}/tracks`, { tracks: videos });
            onMessage(videos.length === 1 ? t.saveTo.added(p.title) : t.saveTo.addedMany(p.title, tracks.length));
            onSaved();
        } catch (e) {
            onMessage(tError(e instanceof Error ? e.message : 'network'));
            setPending(null);
        }
    }

    async function create(e: React.SubmitEvent) {
        e.preventDefault();
        const title = newTitle?.trim();
        if (!title) return;
        setPending('new');
        try {
            // A playlist memo can't be null; a song without one just leaves it out.
            const tracks = videos.map(({ memo, ...v }) => ({ ...v, memo: memo ?? undefined }));
            await send('/api/posts', { title, tracks });
            onMessage(t.saveTo.created(title, videos.length));
            onSaved();
        } catch (e) {
            onMessage(tError(e instanceof Error ? e.message : 'network'));
            setPending(null);
        }
    }

    return (
        <div className={`rounded-lg border border-leaf/30 bg-pine/60 p-2 ${className}`}>
            <div className="mb-1 flex items-center justify-between gap-2 px-1">
                <p className="text-xs font-semibold text-lime/70">
                    {videos.length === 1 ? t.saveTo.title : t.saveTo.titleMany(videos.length)}
                </p>
                <button
                    type="button"
                    onClick={onClose}
                    className="icon-btn size-6 text-lime/40 hover:text-lime"
                    aria-label={t.saveTo.close}>
                    <Icon as={LuX} className="size-3.5" />
                </button>
            </div>
            {playlists === null ? (
                <p className="px-1 py-1.5 text-xs text-lime/50">{t.saveTo.loading}</p>
            ) : (
                <>
                    {playlists.length === 0 ? (
                        <p className="px-1 py-1.5 text-xs text-lime/55">{t.saveTo.empty}</p>
                    ) : (
                        <ul className="max-h-48 space-y-0.5 overflow-y-auto">
                            {playlists.map((p) => {
                                const fresh = videos.filter((v) => !p.tracks.some((tr) => tr.videoId === v.videoId)).length;
                                const left = MAX_POST_TRACKS - p.tracks.length;
                                const has = fresh === 0;
                                const full = fresh > left;
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
                                                    left > 0 ? t.saveTo.onlyLeft(left) : t.saveTo.full
                                                ) : videos.length > 1 ? (
                                                    `${t.common.songs(p.tracks.length)} · +${fresh}`
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
                    <div className="mt-1 border-t border-leaf/20 pt-1">
                        {newTitle === null ? (
                            <button
                                type="button"
                                onClick={() => setNewTitle('')}
                                disabled={pending !== null}
                                className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm font-medium text-moss hover:bg-fern/50">
                                <Icon as={LuPlus} className="size-3.5" />
                                {t.saveTo.newPlaylist}
                            </button>
                        ) : (
                            <form onSubmit={create} className="space-y-1 px-1 py-1">
                                <div className="flex gap-1.5">
                                    <input
                                        autoFocus
                                        value={newTitle}
                                        onChange={(e) => setNewTitle(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Escape' && setNewTitle(null)}
                                        maxLength={120}
                                        placeholder={t.saveTo.newTitle}
                                        aria-label={t.saveTo.newTitle}
                                        className="input py-1.5 text-xs"
                                    />
                                    <button
                                        className="btn-primary shrink-0 px-2.5 py-1 text-xs"
                                        disabled={!newTitle.trim() || tooMany || pending !== null}>
                                        {pending === 'new' ? '…' : t.saveTo.createNew}
                                    </button>
                                </div>
                                <p className="text-[10px] text-lime/40">
                                    {tooMany ? tError('songsMax') : t.saveTo.newHint}
                                </p>
                            </form>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
