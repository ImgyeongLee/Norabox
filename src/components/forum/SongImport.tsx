'use client';

import { useState } from 'react';
import { LuX } from 'react-icons/lu';
import { Icon } from '@/components/icons';
import { useI18n } from '@/i18n/client';
import type { ErrorCode } from '@/i18n/messages/en';
import { parseSongList, type SongRowFailure } from '@/lib/song-import';
import type { Video } from '@/lib/validation';

type Props = {
    /** Video ids already in the playlist; pasting them again is reported, not added. */
    existingIds: string[];
    /** How many more songs the playlist can take. */
    slots: number;
    /** Appends the songs that were found, in the pasted order. */
    onAdd: (songs: { video: Video; memo: string }[]) => void;
    onClose: () => void;
};

/**
 * The playlist editor's "Paste a list": one "YouTube link, memo" per line. Songs that are found
 * are added; the lines that failed stay in the box, listed with their line number and why.
 */
export function SongImport({ existingIds, slots, onAdd, onClose }: Props) {
    const { t, tError } = useI18n();
    const [text, setText] = useState('');
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<{ added: number; failures: SongRowFailure[] } | null>(null);

    async function run() {
        const { rows, failures } = parseSongList(text, existingIds, slots);
        setBusy(true);
        let found = new Map<string, Video>();
        let lookupError: ErrorCode | null = null;
        if (rows.length > 0) {
            try {
                const res = await fetch(`/api/youtube/videos?ids=${rows.map((r) => r.videoId).join(',')}`);
                const data = await res.json();
                if (!res.ok) lookupError = data.error ?? 'videoLookupFailed';
                else found = new Map((data.videos as Video[]).map((v) => [v.videoId, v]));
            } catch {
                lookupError = 'network';
            }
        }
        setBusy(false);

        const added = rows.filter((r) => found.has(r.videoId));
        for (const r of rows) {
            if (!found.has(r.videoId)) {
                failures.push({ line: r.line, text: r.text, error: lookupError ?? 'videoUnavailable' });
            }
        }
        failures.sort((a, b) => a.line - b.line);
        if (added.length > 0) onAdd(added.map((r) => ({ video: found.get(r.videoId)!, memo: r.memo })));
        setResult({ added: added.length, failures });
        // Leave only what still needs fixing.
        setText(failures.map((f) => f.text).join('\n'));
    }

    return (
        <div className="card space-y-3 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
                <div>
                    <h3 className="font-semibold">{t.editor.importTitle}</h3>
                    <p className="mt-1 text-xs text-lime/55">{t.editor.importHint}</p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="icon-btn size-8 shrink-0 text-lime/40 hover:text-lime"
                    aria-label={t.editor.importClose}>
                    <Icon as={LuX} className="size-4" />
                </button>
            </div>
            <textarea
                className="input min-h-32 resize-y py-2 font-mono text-xs"
                rows={6}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t.editor.importPlaceholder}
                aria-label={t.editor.importLabel}
                spellCheck={false}
            />
            {result && (
                <div role="status" className="space-y-2 text-sm">
                    <p className={result.added > 0 ? 'text-moss' : 'text-lime/70'}>{t.editor.importAdded(result.added)}</p>
                    {result.failures.length > 0 && (
                        <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2">
                            <p className="text-danger">{t.editor.importFailed(result.failures.length)}</p>
                            <ul className="mt-2 space-y-1.5">
                                {result.failures.map((f) => (
                                    <li key={f.line} className="text-xs">
                                        <span className="font-semibold text-danger">{t.editor.importLine(f.line)}</span>
                                        <span className="text-lime/80"> · {tError(f.error)}</span>
                                        <span className="block truncate font-mono text-lime/45">{f.text}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
            <div className="flex justify-end">
                <button type="button" className="btn-primary" disabled={busy || !text.trim()} onClick={run}>
                    {busy ? t.editor.importAdding : t.editor.importSubmit}
                </button>
            </div>
        </div>
    );
}
