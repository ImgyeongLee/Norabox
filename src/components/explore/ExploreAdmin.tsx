'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useConfirm } from '@/components/ConfirmDialog';
import { useI18n } from '@/i18n/client';
import type { ExploreAction } from '@/lib/explore';

// Site-admin tools on Explore (src/app/api/explore/songs): blur a frightening thumbnail, or swap
// the song out for another.

function useExploreAction() {
    const router = useRouter();
    const { tError } = useI18n();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function set(videoId: string, action: ExploreAction | 'none') {
        setBusy(true);
        setError(null);
        try {
            const res = await fetch('/api/explore/songs', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoId, action }),
            });
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'generic');
            router.refresh();
        } catch (e) {
            setError(tError(e instanceof Error ? e.message : 'network'));
        } finally {
            setBusy(false);
        }
    }
    return { busy, error, set };
}

/** Under each song: who added it, plus "Blur thumbnail" and "Swap for another song". */
export function ExploreSongAdmin({ videoId, blurred, adders }: { videoId: string; blurred: boolean; adders: string[] }) {
    const { t } = useI18n();
    const confirm = useConfirm();
    const { busy, error, set } = useExploreAction();

    async function swap() {
        const ok = await confirm({ title: t.explore.swapTitle, body: t.explore.swapBody, confirmLabel: t.explore.swap, danger: true });
        if (ok) await set(videoId, 'hide');
    }

    return (
        <div className="mt-2 border-t border-leaf/20 pt-2">
            {adders.length > 0 && <p className="text-xs text-moss">{t.explore.addedBy(adders.join(', '))}</p>}
            <div className="mt-1.5 flex flex-wrap gap-1.5">
                <button
                    type="button"
                    className="btn-secondary px-2.5 py-1 text-xs"
                    disabled={busy}
                    onClick={() => set(videoId, blurred ? 'none' : 'blur')}
                >
                    {blurred ? t.explore.unblur : t.explore.blur}
                </button>
                <button type="button" className="btn-danger px-2.5 py-1 text-xs" disabled={busy} onClick={swap}>
                    {t.explore.swap}
                </button>
            </div>
            {error && (
                <p role="alert" className="mt-1 text-xs text-danger">
                    {error}
                </p>
            )}
        </div>
    );
}

/** Below the grid: songs taken out of Explore, each with "Put back". */
export function HiddenExploreSongs({ songs }: { songs: { videoId: string; title: string }[] }) {
    const { t } = useI18n();
    const { busy, error, set } = useExploreAction();
    if (songs.length === 0) return null;
    return (
        <section className="card mt-10 p-5">
            <h2 className="text-lg font-semibold">{t.explore.hiddenTitle}</h2>
            <p className="mt-0.5 text-xs muted">{t.explore.hiddenLead}</p>
            <ul className="mt-3 divide-y divide-leaf/20">
                {songs.map((s) => (
                    <li key={s.videoId} className="flex items-center gap-3 py-2">
                        <span className="min-w-0 flex-1 truncate text-sm">{s.title}</span>
                        <button
                            type="button"
                            className="btn-secondary shrink-0 px-2.5 py-1 text-xs"
                            disabled={busy}
                            onClick={() => set(s.videoId, 'none')}
                        >
                            {t.explore.restore}
                        </button>
                    </li>
                ))}
            </ul>
            {error && (
                <p role="alert" className="mt-1 text-xs text-danger">
                    {error}
                </p>
            )}
        </section>
    );
}
