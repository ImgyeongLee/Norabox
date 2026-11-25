'use client';

import {
    closestCenter,
    DndContext,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useRouter } from 'next/navigation';
import { useEffect, useEffectEvent, useId, useMemo, useState, useSyncExternalStore } from 'react';
import { LuChevronDown, LuChevronUp, LuClipboardList, LuMusic, LuPlus } from 'react-icons/lu';
import { useConfirm } from '@/components/ConfirmDialog';
import { GripIcon, Icon, TrashIcon } from '@/components/icons';
import { ScenarioField } from '@/components/forum/ScenarioField';
import { SongImport } from '@/components/forum/SongImport';
import { VisibilityPicker } from '@/components/forum/VisibilityPicker';
import { YouTubeEmbed } from '@/components/forum/YouTubeEmbed';
import { formatDuration } from '@/lib/format';
import { dateLocale } from '@/i18n/config';
import { useI18n } from '@/i18n/client';
import { useJsonForm } from '@/lib/use-json-form';
import { DRAFT_TTL_DAYS, MAX_DRAFTS, MAX_MEMO } from '@/lib/limits';
import {
    deleteDraft,
    DRAFT_TTL_MS,
    draftsKey,
    isEmptyDraft,
    listDrafts,
    parseDrafts,
    saveDraft,
    type Draft,
    type DraftContent,
} from '@/lib/playlist-drafts';
import { MAX_POST_TRACKS, type Video } from '@/lib/validation';
import { parsePlaylistId, parseVideoId } from '@/lib/youtube-url';
import type { Visibility } from '@/lib/visibility';

type InitialTrack = Video & { memo: string };
type Initial = {
    id?: string;
    title: string;
    scenario: string;
    writer: string;
    visibility: Visibility;
    anonymous: boolean;
    tracks: InitialTrack[];
};

type Song = {
    key: string;
    link: string;
    video: Video | null;
    loading: boolean;
    error: string | null;
    memo: string;
};

// Cards on the first render get keys by position, so the server's HTML and the browser agree on
// their ids; cards added later only ever exist in the browser and can use random keys.
const newSong = (key: string = crypto.randomUUID()): Song => ({
    key,
    link: '',
    video: null,
    loading: false,
    error: null,
    memo: '',
});

// Drafts live in localStorage (src/lib/playlist-drafts.ts): no request to save, list or open one.
const DRAFTS_EVENT = 'norabox:drafts';
const DAY_MS = 24 * 60 * 60 * 1000;

function localStore(): Storage | null {
    try {
        return window.localStorage;
    } catch {
        return null;
    }
}

/** Re-reads the draft list after this tab changed it (other tabs get the browser's storage event). */
const notifyDrafts = () => window.dispatchEvent(new Event(DRAFTS_EVENT));

function subscribeDrafts(onChange: () => void) {
    window.addEventListener('storage', onChange);
    window.addEventListener(DRAFTS_EVENT, onChange);
    return () => {
        window.removeEventListener('storage', onChange);
        window.removeEventListener(DRAFTS_EVENT, onChange);
    };
}

/** Ctrl+S, or ⌘S on a Mac. `code` too: with a Korean keyboard layout, `key` is "ㄴ". */
const isSaveShortcut = (e: KeyboardEvent) =>
    (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && (e.key.toLowerCase() === 's' || e.code === 'KeyS');

export function PostEditor({
    initial,
    defaultVisibility = 'private',
    draftOwner,
}: {
    initial?: Initial;
    defaultVisibility?: Visibility;
    /** The signed-in user's id, on a new playlist: turns on drafts (Ctrl+S), kept per account. */
    draftOwner?: string;
}) {
    const router = useRouter();
    const confirm = useConfirm();
    const { t, tError, locale } = useI18n();
    const editing = !!initial?.id;
    const [title, setTitle] = useState(initial?.title ?? '');
    const [scenario, setScenario] = useState(initial?.scenario ?? '');
    const [writer, setWriter] = useState(initial?.writer ?? '');
    const [visibility, setVisibility] = useState<Visibility>(initial?.visibility ?? defaultVisibility);
    const [anonymous, setAnonymous] = useState(initial?.anonymous ?? false);
    const [songs, setSongs] = useState<Song[]>(() =>
        initial?.tracks.length
            ? initial.tracks.map(({ memo, ...video }, i) => ({
                  ...newSong(`initial-${i}`),
                  link: `https://www.youtube.com/watch?v=${video.videoId}`,
                  video,
                  memo,
              }))
            : [newSong('initial-0')],
    );
    const { errors, setErrors, busy, submit } = useJsonForm();
    // Song keys in the order they were sent, to map server errors like "tracks.2.memo" back to cards.
    const [sentKeys, setSentKeys] = useState<string[]>([]);
    const [importing, setImporting] = useState(false);
    // The draft this editor saves to (null: the next Ctrl+S makes a new one).
    const [draftId, setDraftId] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    // The stored string, so the snapshot only changes when the drafts do; null on the server.
    const rawDrafts = useSyncExternalStore(
        subscribeDrafts,
        () => (draftOwner ? (localStore()?.getItem(draftsKey(draftOwner)) ?? null) : null),
        () => null,
    );
    // "Now" for days left and expiry. Moved forward on every save, so a draft saved after the page
    // opened doesn't look like it has more than 30 days left.
    const [now, setNow] = useState(Date.now);
    const drafts = useMemo(() => parseDrafts(rawDrafts, now), [rawDrafts, now]);

    // Reordering songs by dragging their handle (same setup as the room's playlist). A fixed id keeps
    // dnd-kit's accessibility ids the same on the server and in the browser.
    const dndId = useId();
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );
    const [dragging, setDragging] = useState(false);

    function onDragEnd({ active, over }: DragEndEvent) {
        setDragging(false);
        if (!over || active.id === over.id) return;
        setSongs((ss) => {
            const keys = ss.map((s) => s.key);
            return arrayMove(ss, keys.indexOf(String(active.id)), keys.indexOf(String(over.id)));
        });
    }

    // Cards with nothing typed in don't count: they're skipped on save, and a pasted list replaces them.
    const isBlank = (s: Song) => !s.link.trim() && !s.memo.trim();
    const slots = MAX_POST_TRACKS - songs.filter((s) => !isBlank(s)).length;

    const update = (key: string, patch: Partial<Song>) =>
        setSongs((ss) => ss.map((s) => (s.key === key ? { ...s, ...patch } : s)));

    async function changeLink(key: string, link: string) {
        const id = parseVideoId(link);
        const current = songs.find((s) => s.key === key);
        if (!id) {
            // A playlist link belongs in "Paste a list", which adds all its songs.
            const error = !link.trim() ? null : parsePlaylistId(link) ? 'songIsPlaylist' : 'songLinkInvalid';
            update(key, { link, video: null, loading: false, error });
            return;
        }
        if (current?.video?.videoId === id) return update(key, { link, error: null });
        update(key, { link, video: null, loading: true, error: null });
        try {
            const res = await fetch(`/api/youtube/video?url=${encodeURIComponent(link)}`);
            const data = await res.json();
            // Ignore the answer if the link was changed again while we waited.
            setSongs((ss) =>
                ss.map((s) =>
                    s.key === key && s.link === link
                        ? res.ok
                            ? { ...s, video: data.video, loading: false, error: null }
                            : { ...s, loading: false, error: data.error ?? 'videoLookupFailed' }
                        : s,
                ),
            );
        } catch {
            setSongs((ss) =>
                ss.map((s) =>
                    s.key === key && s.link === link ? { ...s, loading: false, error: 'network' } : s,
                ),
            );
        }
    }

    function addImported(added: { video: Video; memo: string }[]) {
        setSongs((ss) => [
            ...ss.filter((s) => !isBlank(s)),
            ...added.map(({ video, memo }) => ({
                ...newSong(),
                link: `https://www.youtube.com/watch?v=${video.videoId}`,
                video,
                memo,
            })),
        ]);
    }

    function move(index: number, dir: -1 | 1) {
        setSongs((ss) => {
            const next = [...ss];
            const [s] = next.splice(index, 1);
            next.splice(index + dir, 0, s);
            return next;
        });
    }

    // Deletes expired drafts from storage (the list above already leaves them out).
    useEffect(() => {
        const storage = localStore();
        if (!draftOwner || !storage) return;
        const before = storage.getItem(draftsKey(draftOwner));
        listDrafts(storage, draftOwner);
        if (storage.getItem(draftsKey(draftOwner)) !== before) notifyDrafts();
    }, [draftOwner]);

    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 3500);
        return () => clearTimeout(timer);
    }, [toast]);

    const content = (): DraftContent => ({
        title,
        scenario,
        writer,
        visibility,
        anonymous,
        tracks: songs.filter((s) => !isBlank(s)).map((s) => ({ link: s.link, video: s.video, memo: s.memo })),
    });

    // From the Save draft button, and from Ctrl+S through the Effect Event below.
    function saveToDrafts() {
        const storage = localStore();
        if (!draftOwner || !storage) return setToast(t.editor.drafts.storage);
        const at = Date.now();
        const res = saveDraft(storage, draftOwner, draftId, content(), at);
        if (!res.ok) return setToast(t.editor.drafts[res.reason]);
        setDraftId(res.id);
        setNow(at);
        notifyDrafts();
        const time = new Date().toLocaleTimeString(dateLocale(locale), { hour: 'numeric', minute: '2-digit' });
        setToast(t.editor.drafts.saved(time));
    }

    // Always sees the latest form state, without re-adding the key listener on every keystroke.
    const onSaveShortcut = useEffectEvent(saveToDrafts);

    useEffect(() => {
        if (!draftOwner) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (!isSaveShortcut(e)) return;
            // Instead of the browser's "Save page as…".
            e.preventDefault();
            onSaveShortcut();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [draftOwner]);

    async function openDraft(d: Draft) {
        if (
            !isEmptyDraft(content()) &&
            !(await confirm({
                title: t.editor.drafts.openConfirmTitle,
                body: t.editor.drafts.openConfirmBody,
                confirmLabel: t.editor.drafts.open,
            }))
        ) {
            return;
        }
        const restored = d.tracks.map((tr) => ({ ...newSong(), link: tr.link, video: tr.video, memo: tr.memo }));
        setTitle(d.title);
        setScenario(d.scenario);
        setWriter(d.writer);
        setVisibility(d.visibility);
        setAnonymous(d.anonymous);
        setSongs(restored.length ? restored : [newSong()]);
        setErrors({});
        setDraftId(d.id);
        // Songs saved while they were still being looked up have a link but no video yet.
        for (const s of restored) if (!s.video && s.link) void changeLink(s.key, s.link);
    }

    async function removeDraft(d: Draft) {
        const storage = localStore();
        if (!draftOwner || !storage) return;
        const ok = await confirm({
            title: t.editor.drafts.deleteConfirmTitle,
            body: t.editor.drafts.deleteConfirmBody,
            confirmLabel: t.editor.drafts.delete,
            danger: true,
        });
        if (!ok) return;
        deleteDraft(storage, draftOwner, d.id);
        if (d.id === draftId) setDraftId(null);
        notifyDrafts();
    }

    async function onSubmit(e: React.SubmitEvent) {
        e.preventDefault();
        // Skip untouched cards; every other card needs a loaded video.
        const filled = songs.filter((s) => !isBlank(s));
        const cardErrors: Record<string, string> = {};
        for (const s of filled) {
            if (s.loading) cardErrors[`song.${s.key}`] = 'songLoading';
            else if (!s.video) cardErrors[`song.${s.key}`] = s.error ?? 'songLinkRequired';
        }
        if (filled.length === 0) cardErrors.tracks = 'songsRequired';
        if (Object.keys(cardErrors).length > 0) {
            setErrors({ ...cardErrors, form: 'fixFields' });
            return;
        }

        setSentKeys(filled.map((s) => s.key));
        const payload = {
            title,
            scenario,
            writer,
            visibility,
            anonymous,
            tracks: filled.map((s) => ({ ...s.video!, memo: s.memo })),
        };
        const res = await submit<{ id: string }>(
            editing ? `/api/posts/${initial!.id}` : '/api/posts',
            payload,
            editing ? 'PATCH' : 'POST',
        );
        if (res) {
            // Published: the draft it came from has done its job.
            const storage = localStore();
            if (draftOwner && draftId && storage) deleteDraft(storage, draftOwner, draftId);
            router.push(`/forum/${res.id}`);
            router.refresh();
        }
    }

    const songError = (s: Song) => {
        const i = sentKeys.indexOf(s.key);
        return errors[`song.${s.key}`] ?? (i >= 0 ? errors[`tracks.${i}.memo`] : undefined);
    };

    return (
        <form onSubmit={onSubmit} className="space-y-6" noValidate>
            {draftOwner && (
                <section className="card p-4 sm:p-5">
                    <p className="text-xs muted">{t.editor.drafts.hint}</p>
                    {drafts.length > 0 && (
                        // Folded by default, so the drafts don't push the editor down.
                        <details className="group mt-3">
                            <summary className="-mx-2 flex cursor-pointer list-none items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold hover:bg-fern/40 [&::-webkit-details-marker]:hidden">
                                {t.editor.drafts.title}
                                <span className="text-xs font-normal text-lime/50">
                                    {drafts.length}/{MAX_DRAFTS}
                                </span>
                                <Icon
                                    as={LuChevronDown}
                                    className="ml-auto size-4 text-lime/50 transition group-open:rotate-180"
                                />
                            </summary>
                            <ul className="mt-1 divide-y divide-leaf/20">
                                {drafts.map((d) => {
                                    const name = d.title.trim() || t.editor.drafts.untitled;
                                    const savedAt = new Date(d.updatedAt).toLocaleString(dateLocale(locale), {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: 'numeric',
                                        minute: '2-digit',
                                    });
                                    // Clamped: a draft saved in another tab after `now` would otherwise show 31.
                                    const daysLeft = Math.min(
                                        DRAFT_TTL_DAYS,
                                        Math.ceil((d.updatedAt + DRAFT_TTL_MS - now) / DAY_MS),
                                    );
                                    const current = d.id === draftId;
                                    return (
                                        <li key={d.id} className="flex items-center gap-2 py-2">
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold">
                                                    {name}
                                                    {current && (
                                                        <span className="ml-2 text-xs font-normal text-moss">
                                                            {t.editor.drafts.editing}
                                                        </span>
                                                    )}
                                                </p>
                                                <p className="truncate text-xs text-lime/55">
                                                    {t.common.songs(d.tracks.length)} · {t.editor.drafts.savedAt(savedAt)} ·{' '}
                                                    {t.editor.drafts.expiresIn(daysLeft)}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                className="btn-secondary shrink-0 px-3 py-1.5 text-sm"
                                                onClick={() => openDraft(d)}
                                                disabled={current}>
                                                {t.editor.drafts.open}
                                            </button>
                                            <button
                                                type="button"
                                                className="icon-btn size-8 shrink-0 hover:text-danger"
                                                onClick={() => removeDraft(d)}
                                                aria-label={t.editor.drafts.deleteLabel(name)}>
                                                <TrashIcon className="size-4" />
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </details>
                    )}
                </section>
            )}

            <section className="card space-y-4 p-5 sm:p-6">
                <div>
                    <label htmlFor="title" className="label">
                        {t.editor.title}
                    </label>
                    <input
                        id="title"
                        className="input text-lg font-semibold"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        maxLength={120}
                        placeholder={t.editor.titlePlaceholder}
                        aria-invalid={!!errors.title}
                    />
                    {errors.title && <p className="field-error">{tError(errors.title)}</p>}
                </div>
                <ScenarioField
                    scenario={scenario}
                    writer={writer}
                    onScenario={setScenario}
                    onWriter={setWriter}
                    errors={{ scenario: errors.scenario, writer: errors.writer }}
                />
                <VisibilityPicker value={visibility} onChange={setVisibility} />
                {/* Only matters once others can see the playlist; kept as is while it's private. */}
                {visibility !== 'private' && (
                    <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                        <input
                            type="checkbox"
                            checked={anonymous}
                            onChange={(e) => setAnonymous(e.target.checked)}
                            className="mt-0.5 size-4 shrink-0 accent-[var(--color-moss)]"
                        />
                        <span>
                            <span className="font-semibold">{t.editor.anonymous}</span>
                            <span className="block text-xs muted">{t.editor.anonymousHint}</span>
                        </span>
                    </label>
                )}
            </section>

            <section className="space-y-4">
                <div className="flex items-baseline justify-between">
                    <h2 className="text-xl font-bold">{t.editor.songs}</h2>
                    <span className="text-xs text-lime/50">
                        {songs.length}/{MAX_POST_TRACKS}
                    </span>
                </div>

                <DndContext
                    id={dndId}
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={() => setDragging(true)}
                    onDragCancel={() => setDragging(false)}
                    onDragEnd={onDragEnd}>
                    <SortableContext items={songs.map((s) => s.key)} strategy={verticalListSortingStrategy}>
                        {/* While dragging, a playing video's iframe would swallow the pointer and stall the drag. */}
                        <div className={`space-y-4 ${dragging ? '[&_iframe]:pointer-events-none' : ''}`}>
                            {songs.map((song, i) => {
                                const err = songError(song);
                                return (
                                    // Two columns: the video in a 200x200px square (YouTube's minimum player size) on
                                    // the left, the fields on the right, centered against each other. On narrow screens
                                    // the fields wrap below and the square is centered across.
                                    <SortableSongCard key={song.key} id={song.key} handleLabel={t.editor.dragSong(i + 1)}>
                                        {(handle) => (
                                            <>
                                                {song.video ? (
                                                    <YouTubeEmbed videoId={song.video.videoId} title={song.video.title} compact square />
                                                ) : (
                                                    <div
                                                        aria-hidden
                                                        className="flex size-50 shrink-0 items-center justify-center rounded-xl border border-dashed border-leaf/50 text-lime/30">
                                                        {song.loading ? '…' : <Icon as={LuMusic} className="size-8" />}
                                                    </div>
                                                )}

                                                <div className="min-w-60 flex-1 space-y-2.5">
                                                    <div className="flex items-start gap-2">
                                                        {handle}
                                                        <span className="pt-1 font-mono text-sm font-semibold text-moss">
                                                            {String(i + 1).padStart(2, '0')}
                                                        </span>
                                                        <div className="min-w-0 flex-1 pt-0.5">
                                                            {song.video ? (
                                                                <>
                                                                    <p className="line-clamp-1 text-sm font-semibold leading-snug">
                                                                        {song.video.title}
                                                                    </p>
                                                                    <p className="truncate text-xs muted">
                                                                        {t.post.videoBy(song.video.channel)}
                                                                        {song.video.durationSec
                                                                            ? ` · ${formatDuration(song.video.durationSec)}`
                                                                            : ''}
                                                                    </p>
                                                                </>
                                                            ) : (
                                                                song.loading && <p className="text-sm text-lime/55">{t.editor.loadingVideo}</p>
                                                            )}
                                                        </div>
                                                        <div className="-mr-1 -mt-1 flex shrink-0 items-center">
                                                            <button
                                                                type="button"
                                                                className="icon-btn size-8 text-sm"
                                                                onClick={() => move(i, -1)}
                                                                disabled={i === 0}
                                                                aria-label={t.editor.moveUp(i + 1)}
                                                            >
                                                                <Icon as={LuChevronUp} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="icon-btn size-8 text-sm"
                                                                onClick={() => move(i, 1)}
                                                                disabled={i === songs.length - 1}
                                                                aria-label={t.editor.moveDown(i + 1)}
                                                            >
                                                                <Icon as={LuChevronDown} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="icon-btn size-8 hover:text-danger"
                                                                onClick={() =>
                                                                    setSongs((ss) =>
                                                                        ss.length === 1 ? [newSong()] : ss.filter((s) => s.key !== song.key),
                                                                    )
                                                                }
                                                                aria-label={t.editor.removeSong(i + 1)}
                                                            >
                                                                <TrashIcon className="size-4" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label htmlFor={`link-${song.key}`} className="sr-only">
                                                            {t.editor.youtubeLink}
                                                        </label>
                                                        <input
                                                            id={`link-${song.key}`}
                                                            className="input py-2 text-sm"
                                                            type="url"
                                                            inputMode="url"
                                                            value={song.link}
                                                            onChange={(e) => changeLink(song.key, e.target.value)}
                                                            onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                                                            placeholder="https://www.youtube.com/watch?v=…"
                                                            aria-invalid={!!err && !song.video}
                                                        />
                                                    </div>

                                                    <div>
                                                        <label htmlFor={`memo-${song.key}`} className="label">
                                                            {t.editor.memo} <span className="font-normal text-lime/45">{t.common.optional}</span>
                                                        </label>
                                                        <textarea
                                                            id={`memo-${song.key}`}
                                                            className="input min-h-10 resize-y py-2 text-sm"
                                                            rows={1}
                                                            value={song.memo}
                                                            onChange={(e) => update(song.key, { memo: e.target.value })}
                                                            maxLength={MAX_MEMO}
                                                            placeholder={t.editor.memoPlaceholder}
                                                        />
                                                        <p className="mt-1 flex gap-2 text-xs text-lime/45">
                                                            <span className="flex-1">{t.editor.memoHint}</span>
                                                            {/* Older posts can have longer memos; the count shows how much to cut. */}
                                                            <span
                                                                className={`shrink-0 font-mono ${song.memo.trim().length > MAX_MEMO ? 'text-danger' : ''}`}>
                                                                {song.memo.trim().length}/{MAX_MEMO}
                                                            </span>
                                                        </p>
                                                    </div>

                                                    {(err || (song.error && !song.loading)) && (
                                                        <p className="field-error">{tError(err ?? song.error)}</p>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </SortableSongCard>
                                );
                            })}
                        </div>
                    </SortableContext>
                </DndContext>

                {errors.tracks && <p className="field-error">{tError(errors.tracks)}</p>}
                <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                        type="button"
                        className="btn-secondary flex-1 border-dashed"
                        onClick={() => setSongs((ss) => [...ss, newSong()])}
                        disabled={songs.length >= MAX_POST_TRACKS}
                    >
                        <Icon as={LuPlus} />
                        {t.editor.addSong}
                    </button>
                    <button
                        type="button"
                        className="btn-secondary flex-1 border-dashed"
                        onClick={() => setImporting(true)}
                        disabled={importing || slots <= 0}
                    >
                        <Icon as={LuClipboardList} />
                        {t.editor.importOpen}
                    </button>
                </div>
                {importing && (
                    <SongImport
                        existingIds={songs.flatMap((s) => s.video?.videoId ?? parseVideoId(s.link) ?? [])}
                        slots={slots}
                        onAdd={addImported}
                        onClose={() => setImporting(false)}
                    />
                )}
            </section>

            {errors.form && (
                <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                    {tError(errors.form)}
                </p>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" className="btn-ghost" onClick={() => router.back()}>
                    {t.common.cancel}
                </button>
                {draftOwner && (
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={saveToDrafts}
                        disabled={busy}
                        title={t.editor.drafts.saveShortcut}>
                        {t.editor.drafts.save}
                    </button>
                )}
                <button className="btn-primary" disabled={busy}>
                    {busy ? t.common.saving : editing ? t.editor.saveChanges : t.editor.publish}
                </button>
            </div>

            {toast && (
                <div
                    role="status"
                    className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-sm rounded-xl border border-leaf bg-pine/95 px-4 py-3 text-sm shadow-2xl">
                    {toast}
                </div>
            )}
        </form>
    );
}

/** A song card that can be dragged by its handle; `children` places the handle. */
function SortableSongCard({
    id,
    handleLabel,
    children,
}: {
    id: string;
    handleLabel: string;
    children: (handle: React.ReactNode) => React.ReactNode;
}) {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
        id,
    });
    const handle = (
        <button
            // Inside the form: a plain button would submit it.
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            className="-ml-1 -mt-1 flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-lime/40 hover:text-lime active:cursor-grabbing"
            aria-label={handleLabel}>
            <GripIcon className="size-4" />
        </button>
    );
    return (
        <article
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            className={`card flex flex-wrap items-center justify-center gap-3 p-3 sm:gap-4 sm:p-4 ${
                isDragging ? 'relative z-10 shadow-2xl ring-2 ring-moss' : ''
            }`}>
            {children(handle)}
        </article>
    );
}
