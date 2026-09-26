'use client';

/* eslint-disable @next/next/no-img-element -- YouTube thumbnails */
import { useState } from 'react';
import { formatDuration } from '@/lib/format';
import type { Video } from '@/lib/validation';

type Props = {
    onAdd: (video: Video) => Promise<string | null | void> | string | null | void;
    /** Video ids already in the list, shown as "Added". */
    addedIds?: Set<string>;
    disabled?: boolean;
    disabledReason?: string;
};

/** Search YouTube (or paste a link) and add results. */
export function VideoSearch({ onAdd, addedIds, disabled, disabledReason }: Props) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Video[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [pending, setPending] = useState<string | null>(null);

    async function search(e: React.FormEvent) {
        e.preventDefault();
        const q = query.trim();
        if (!q) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Search failed');
            setResults(data.results);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Search failed');
            setResults(null);
        } finally {
            setLoading(false);
        }
    }

    async function add(v: Video) {
        setPending(v.videoId);
        const err = await onAdd(v);
        setPending(null);
        if (err) setError(err);
    }

    return (
        <div>
            <form onSubmit={search} className="flex gap-2" role="search">
                <input
                    className="input"
                    placeholder="Search YouTube or paste a link"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label="Search YouTube"
                    disabled={disabled}
                />
                <button className="btn-primary shrink-0" disabled={disabled || loading || !query.trim()}>
                    {loading ? '…' : 'Search'}
                </button>
            </form>
            {disabled && disabledReason && <p className="mt-2 text-sm text-lime/60">{disabledReason}</p>}
            {error && <p className="field-error">{error}</p>}
            {results && results.length === 0 && <p className="mt-4 text-sm text-lime/60">No videos found.</p>}
            {results && results.length > 0 && (
                <ul className="mt-3 divide-y divide-leaf/25">
                    {results.map((v) => {
                        const added = addedIds?.has(v.videoId);
                        return (
                            <li key={v.videoId} className="flex items-center gap-3 py-2.5">
                                <img
                                    src={v.thumbnail}
                                    alt=""
                                    className="aspect-video w-24 shrink-0 rounded-lg object-cover sm:w-28"
                                />
                                <div className="min-w-0 flex-1">
                                    <p className="line-clamp-2 text-sm font-medium leading-snug">{v.title}</p>
                                    <p className="mt-0.5 truncate text-xs text-lime/55">
                                        {v.channel} · {formatDuration(v.durationSec)}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    className={
                                        added ? 'btn-ghost shrink-0 px-3 py-2' : 'btn-secondary shrink-0 px-3 py-2'
                                    }
                                    disabled={disabled || pending === v.videoId}
                                    onClick={() => add(v)}
                                    aria-label={`Add ${v.title}`}>
                                    {pending === v.videoId ? '…' : added ? 'Add again' : 'Add'}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
