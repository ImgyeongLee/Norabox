'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { VideoSearch } from '@/components/VideoSearch';
import { Playlist, type SortableTrack } from '@/components/room/Playlist';
import { useJsonForm } from '@/lib/use-json-form';
import type { Video } from '@/lib/validation';

type Initial = { id?: string; title: string; description: string; body: string; tracks: Video[] };

const withKey = (v: Video): SortableTrack => ({ ...v, id: crypto.randomUUID() });
const MAX_TRACKS = 50;

export function PostEditor({ initial }: { initial?: Initial }) {
    const router = useRouter();
    const editing = !!initial?.id;
    const [title, setTitle] = useState(initial?.title ?? '');
    const [description, setDescription] = useState(initial?.description ?? '');
    const [body, setBody] = useState(initial?.body ?? '');
    const [tracks, setTracks] = useState<SortableTrack[]>(() => (initial?.tracks ?? []).map(withKey));
    const { errors, busy, submit } = useJsonForm();

    const [importCode, setImportCode] = useState('');
    const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null);
    const addedIds = useMemo(() => new Set(tracks.map((t) => t.videoId)), [tracks]);

    function addTrack(v: Video) {
        if (tracks.length >= MAX_TRACKS) return `A post can have up to ${MAX_TRACKS} songs`;
        setTracks((t) => [...t, withKey(v)]);
        return null;
    }

    async function importRoom() {
        setImportMsg(null);
        const res = await fetch(`/api/rooms/${encodeURIComponent(importCode)}`);
        if (!res.ok) return setImportMsg({ ok: false, text: 'No room found with that code' });
        const data: { code: string; items: Video[] } = await res.json();
        if (data.items.length === 0)
            return setImportMsg({ ok: false, text: `Room ${data.code} has an empty playlist` });
        const room = data.items.slice(0, MAX_TRACKS - tracks.length);
        setTracks((t) => [...t, ...room.map(withKey)]);
        setImportMsg({
            ok: true,
            text: `Imported ${room.length} song${room.length === 1 ? '' : 's'} from ${data.code}`,
        });
        setImportCode('');
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        const payload = {
            title,
            description,
            body,
            tracks: tracks.map(({ videoId, title, channel, thumbnail, durationSec }) => ({
                videoId,
                title,
                channel,
                thumbnail,
                durationSec,
            })),
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

    return (
        <form onSubmit={onSubmit} className="space-y-6" noValidate>
            <section className="card space-y-4 p-5 sm:p-6">
                <div>
                    <label htmlFor="title" className="label">
                        Title
                    </label>
                    <input
                        id="title"
                        className="input text-lg font-semibold"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        maxLength={120}
                        placeholder="Late night lo-fi for coding"
                    />
                    {errors.title && <p className="field-error">{errors.title}</p>}
                </div>
                <div>
                    <label htmlFor="description" className="label">
                        Description{' '}
                        <span className="font-normal text-lime/45">(optional — shown as the sub-heading)</span>
                    </label>
                    <input
                        id="description"
                        className="input"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        maxLength={200}
                        placeholder="Mellow beats, rainy windows, zero lyrics"
                    />
                    {errors.description && <p className="field-error">{errors.description}</p>}
                </div>
                <div>
                    <label htmlFor="body" className="label">
                        Notes <span className="font-normal text-lime/45">(optional)</span>
                    </label>
                    <textarea
                        id="body"
                        className="input min-h-28 resize-y"
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        maxLength={5000}
                        placeholder="Tell people about this playlist…"
                    />
                    {errors.body && <p className="field-error">{errors.body}</p>}
                </div>
            </section>

            <section className="card p-5 sm:p-6">
                <div className="mb-4 flex items-baseline justify-between">
                    <h2 className="text-lg font-semibold">Songs</h2>
                    <span className="text-xs text-lime/50">
                        {tracks.length}/{MAX_TRACKS}
                    </span>
                </div>
                <Playlist
                    items={tracks}
                    editable
                    onReorder={(ids) => setTracks((t) => ids.map((id) => t.find((x) => x.id === id)!))}
                    onRemove={(id) => setTracks((t) => t.filter((x) => x.id !== id))}
                    emptyText="Search below or import a room's playlist to add songs."
                />
                {errors.tracks && <p className="field-error">{errors.tracks}</p>}

                <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                    <div>
                        <h3 className="label">Search YouTube</h3>
                        <VideoSearch onAdd={addTrack} addedIds={addedIds} disabled={tracks.length >= MAX_TRACKS} />
                    </div>
                    <div>
                        <h3 className="label">Import from a room</h3>
                        <div className="flex gap-2">
                            <input
                                className="input font-mono"
                                placeholder="Room code"
                                value={importCode}
                                onChange={(e) => setImportCode(e.target.value.replace(/[^A-Za-z0-9]/g, ''))}
                                aria-label="Room code to import"
                            />
                            <button
                                type="button"
                                className="btn-secondary shrink-0"
                                onClick={importRoom}
                                disabled={!importCode}>
                                Import
                            </button>
                        </div>
                        {importMsg && (
                            <p className={importMsg.ok ? 'mt-1.5 text-sm text-moss' : 'field-error'}>
                                {importMsg.text}
                            </p>
                        )}
                    </div>
                </div>
            </section>

            {errors.form && (
                <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                    {errors.form}
                </p>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" className="btn-ghost" onClick={() => router.back()}>
                    Cancel
                </button>
                <button className="btn-primary" disabled={busy}>
                    {busy ? 'Saving…' : editing ? 'Save changes' : 'Publish post'}
                </button>
            </div>
        </form>
    );
}
