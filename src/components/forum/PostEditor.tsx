'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { TrashIcon } from '@/components/icons';
import { MarkdownEditor } from '@/components/forum/MarkdownEditor';
import { ScenarioField } from '@/components/forum/ScenarioField';
import { YouTubeEmbed } from '@/components/forum/YouTubeEmbed';
import { formatDuration } from '@/lib/format';
import { useI18n } from '@/i18n/client';
import { useJsonForm } from '@/lib/use-json-form';
import { MAX_POST_TRACKS, MAX_TRACK_DESCRIPTION, type Video } from '@/lib/validation';
import { parseVideoId } from '@/lib/youtube-url';

type InitialTrack = Video & { description: string };
type Initial = { id?: string; title: string; scenario: string; writer: string; tracks: InitialTrack[] };

type Song = {
    key: string;
    link: string;
    video: Video | null;
    loading: boolean;
    error: string | null;
    description: string;
};

const newSong = (): Song => ({
    key: crypto.randomUUID(),
    link: '',
    video: null,
    loading: false,
    error: null,
    description: '',
});

export function PostEditor({ initial }: { initial?: Initial }) {
    const router = useRouter();
    const { t, tError } = useI18n();
    const editing = !!initial?.id;
    const [title, setTitle] = useState(initial?.title ?? '');
    const [scenario, setScenario] = useState(initial?.scenario ?? '');
    const [writer, setWriter] = useState(initial?.writer ?? '');
    const [songs, setSongs] = useState<Song[]>(() =>
        initial?.tracks.length
            ? initial.tracks.map(({ description, ...video }) => ({
                  ...newSong(),
                  link: `https://www.youtube.com/watch?v=${video.videoId}`,
                  video,
                  description,
              }))
            : [newSong()],
    );
    const { errors, setErrors, busy, submit } = useJsonForm();
    // Song keys in the order they were sent, to map server errors like "tracks.2.description" back to cards.
    const [sentKeys, setSentKeys] = useState<string[]>([]);

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
        const filled = songs.filter((s) => s.link.trim() || s.description.trim());
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
            tracks: filled.map((s) => ({ ...s.video!, description: s.description })),
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
        return errors[`song.${s.key}`] ?? (i >= 0 ? errors[`tracks.${i}.description`] : undefined);
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
                        <article key={song.key} className="card space-y-4 p-4 sm:p-5">
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-semibold text-moss">
                                    {String(i + 1).padStart(2, '0')}
                                </span>
                                <div className="ml-auto flex items-center gap-1">
                                    <button
                                        type="button"
                                        className="icon-btn size-8 text-sm"
                                        onClick={() => move(i, -1)}
                                        disabled={i === 0}
                                        aria-label={t.editor.moveUp(i + 1)}
                                    >
                                        ↑
                                    </button>
                                    <button
                                        type="button"
                                        className="icon-btn size-8 text-sm"
                                        onClick={() => move(i, 1)}
                                        disabled={i === songs.length - 1}
                                        aria-label={t.editor.moveDown(i + 1)}
                                    >
                                        ↓
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
                                <label htmlFor={`link-${song.key}`} className="label">
                                    {t.editor.youtubeLink}
                                </label>
                                <input
                                    id={`link-${song.key}`}
                                    className="input"
                                    type="url"
                                    inputMode="url"
                                    value={song.link}
                                    onChange={(e) => changeLink(song.key, e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                                    placeholder="https://www.youtube.com/watch?v=…"
                                    aria-invalid={!!err && !song.video}
                                />
                                {song.loading && <p className="mt-1.5 text-sm text-lime/55">{t.editor.loadingVideo}</p>}
                            </div>

                            {song.video && (
                                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-start">
                                    <YouTubeEmbed videoId={song.video.videoId} title={song.video.title} />
                                    <div className="min-w-0">
                                        <p className="font-semibold leading-snug">{song.video.title}</p>
                                        <p className="mt-1 text-sm text-lime/60">
                                            {t.post.videoBy(song.video.channel)}
                                            {song.video.durationSec ? ` · ${formatDuration(song.video.durationSec)}` : ''}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label htmlFor={`desc-${song.key}`} className="label">
                                    {t.editor.description} <span className="font-normal text-lime/45">{t.common.optional}</span>
                                </label>
                                <MarkdownEditor
                                    id={`desc-${song.key}`}
                                    value={song.description}
                                    onChange={(description) => update(song.key, { description })}
                                    maxLength={MAX_TRACK_DESCRIPTION}
                                    placeholder={t.editor.descriptionPlaceholder}
                                />
                            </div>

                            {(err || (song.error && !song.loading)) && (
                                <p className="field-error">{tError(err ?? song.error)}</p>
                            )}
                        </article>
                    );
                })}

                {errors.tracks && <p className="field-error">{tError(errors.tracks)}</p>}
                <button
                    type="button"
                    className="btn-secondary w-full border-dashed"
                    onClick={() => setSongs((ss) => [...ss, newSong()])}
                    disabled={songs.length >= MAX_POST_TRACKS}
                >
                    {t.editor.addSong}
                </button>
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
