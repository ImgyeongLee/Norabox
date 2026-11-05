'use client';

import { useState } from 'react';
import { LuEyeOff, LuListPlus, LuStickyNote } from 'react-icons/lu';
import { Icon } from '@/components/icons';
import { PlaylistPicker } from '@/components/room/SaveToPlaylist';
import { useI18n } from '@/i18n/client';
import { formatDuration } from '@/lib/format';
import type { PlaylistEntry } from '@/lib/room-types';

type Props = {
    /** The room's playlist as this member sees it (memos and hidden songs only in the admin's copy). */
    items: PlaylistEntry[];
    onClose: () => void;
    /** Shows the result (or an error) as the room's toast. */
    onMessage: (text: string) => void;
};

/**
 * Replaces the room's playlist while a signed-in member picks songs to save, then adds them all
 * at once to one of their playlists (or a new one), memos included.
 */
export function SaveManyToPlaylist({ items, onClose, onMessage }: Props) {
    const { t } = useI18n();
    const [selected, setSelected] = useState<Set<string>>(() => new Set());
    const [picking, setPicking] = useState(false);

    // Songs removed from the room meanwhile drop out of the selection. The same video can be in
    // the room twice; a playlist takes it once.
    const chosen = items.filter((i) => selected.has(i.id));
    const videos = chosen
        .filter((v, i) => chosen.findIndex((o) => o.videoId === v.videoId) === i)
        .map(({ videoId, title, channel, thumbnail, durationSec, memo }) => ({
            videoId,
            title,
            channel,
            thumbnail,
            durationSec,
            memo,
        }));
    const allSelected = chosen.length === items.length && items.length > 0;

    function toggle(id: string) {
        setSelected((s) => {
            const next = new Set(s);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    return (
        <div>
            <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-xs text-lime/55">{t.saveMany.hint}</p>
                <button type="button" onClick={onClose} className="btn-ghost shrink-0 px-2 py-1 text-xs">
                    {t.saveMany.cancel}
                </button>
            </div>
            <label className="flex cursor-pointer items-center gap-2 px-1 py-1.5 text-xs text-lime/70">
                <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)))}
                    className="size-4 accent-[var(--color-moss)]"
                />
                {t.likedTab.selectAll}
            </label>
            <ul className="divide-y divide-leaf/20">
                {items.map((v) => (
                    <li key={v.id}>
                        <label className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-2 hover:bg-fern/40">
                            <input
                                type="checkbox"
                                checked={selected.has(v.id)}
                                onChange={() => toggle(v.id)}
                                className="mt-0.5 size-4 shrink-0 accent-[var(--color-moss)]"
                            />
                            <span className="min-w-0 flex-1">
                                <span className="line-clamp-1 text-sm">{v.title}</span>
                                <span className="block truncate text-xs text-lime/50">
                                    {v.channel} · {formatDuration(v.durationSec)}
                                </span>
                                {v.memo && (
                                    <span className="mt-1 flex items-start gap-1 text-xs text-lime/75">
                                        <Icon as={LuStickyNote} className="mt-px size-3 shrink-0 text-moss" />
                                        <span className="whitespace-pre-wrap wrap-break-word">{v.memo}</span>
                                    </span>
                                )}
                            </span>
                            {v.hidden && (
                                <span title={t.playlist.hidden} className="mt-0.5 shrink-0 text-moss">
                                    <Icon as={LuEyeOff} className="size-4" />
                                    <span className="sr-only">{t.playlist.hidden}</span>
                                </span>
                            )}
                        </label>
                    </li>
                ))}
            </ul>
            <div className="sticky bottom-0 mt-2 pt-2">
                {picking && videos.length > 0 ? (
                    // Solid underneath, so the songs scrolling past don't show through the panel.
                    <div className="rounded-lg bg-pine shadow-xl">
                        <PlaylistPicker
                            videos={videos}
                            onSaved={onClose}
                            onClose={() => setPicking(false)}
                            onMessage={onMessage}
                        />
                    </div>
                ) : (
                    <div className="flex justify-end">
                        <button
                            type="button"
                            className="btn-primary gap-1.5 px-3 py-2 text-sm"
                            disabled={videos.length === 0}
                            onClick={() => setPicking(true)}>
                            <Icon as={LuListPlus} className="size-4" />
                            {t.saveMany.save(videos.length)}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
