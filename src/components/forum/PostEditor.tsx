'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LuChevronDown, LuChevronUp, LuClipboardList, LuMusic, LuPlus } from 'react-icons/lu';
import { Icon, TrashIcon } from '@/components/icons';
import { ScenarioField } from '@/components/forum/ScenarioField';
import { SongImport } from '@/components/forum/SongImport';
import { VisibilityPicker } from '@/components/forum/VisibilityPicker';
import { YouTubeEmbed } from '@/components/forum/YouTubeEmbed';
import { formatDuration } from '@/lib/format';
import { useI18n } from '@/i18n/client';
import { useJsonForm } from '@/lib/use-json-form';
import { MAX_MEMO } from '@/lib/limits';
import { MAX_POST_TRACKS, type Video } from '@/lib/validation';
import { parseVideoId } from '@/lib/youtube-url';
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

export function PostEditor({ initial, defaultVisibility = 'private' }: { initial?: Initial; defaultVisibility?: Visibility }) {
    const router = useRouter();
    const { t, tError } = useI18n();
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

    // Cards with nothing typed in don't count: they're skipped on save, and a pasted list replaces them.
    const isBlank = (s: Song) => !s.link.trim() && !s.memo.trim();
    const slots = MAX_POST_TRACKS - songs.filter((s) => !isBlank(s)).length;

    const update = (key: string, patch: Partial<Song>) =>
        setSongs((ss) => ss.map((s) => (s.key === key ? { ...s, ...patch } : s)));

    async function changeLink(key: string, link: string) {
        const id = parseVideoId(link);
        const current = songs.find((s) => s.key === key);
        if (!id) {
            update(key, { link, video: null, loading: false, error: link.trim() ? 'songLinkInvalid' : null });
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

                {songs.map((song, i) => {
                    const err = songError(song);
                    return (
                        // Two columns: the video in a 200x200px square (YouTube's minimum player size) on
                        // the left, the fields on the right, centered against each other. On narrow screens
                        // the fields wrap below and the square is centered across.
                        <article
                            key={song.key}
                            className="card flex flex-wrap items-center justify-center gap-3 p-3 sm:gap-4 sm:p-4">
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
                        </article>
                    );
                })}

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
                <button className="btn-primary" disabled={busy}>
                    {busy ? t.common.saving : editing ? t.editor.saveChanges : t.editor.publish}
                </button>
            </div>
        </form>
    );
}
