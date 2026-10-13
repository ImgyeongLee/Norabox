'use client';

import { useState } from 'react';
import { useConfirm } from '@/components/ConfirmDialog';
import { CopyButton } from '@/components/CopyButton';
import { useI18n } from '@/i18n/client';

/** Author-only panel: the secret share link of an unlisted playlist, with copy and reset. */
export function SharePanel({ postId, visibility, shareToken }: { postId: string; visibility: string; shareToken: string }) {
    const { t, tError } = useI18n();
    const confirm = useConfirm();
    const [token, setToken] = useState(shareToken);
    const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
    const [busy, setBusy] = useState(false);

    if (visibility === 'public') return null;
    if (visibility === 'private') {
        return <p className="card mt-5 px-4 py-3 text-sm text-lime/70">{t.sharePanel.privateNote}</p>;
    }

    const link = () => `${window.location.origin}/s/${token}`;

    async function reset() {
        const ok = await confirm({ title: t.sharePanel.resetTitle, body: t.sharePanel.resetBody, confirmLabel: t.sharePanel.reset, danger: true });
        if (!ok) return;
        setBusy(true);
        const res = await fetch(`/api/posts/${postId}/share-link`, { method: 'POST' }).catch(() => null);
        const data = res ? await res.json().catch(() => ({})) : {};
        setBusy(false);
        if (res?.ok) {
            setToken(data.shareToken);
            setNote({ ok: true, text: t.sharePanel.resetDone });
        } else {
            setNote({ ok: false, text: tError(data.error ?? 'network') });
        }
    }

    return (
        <section className="card mt-5 space-y-3 p-4">
            <div>
                <h2 className="text-sm font-semibold">{t.sharePanel.title}</h2>
                <p className="mt-0.5 text-xs muted">{t.sharePanel.hint}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
                <input
                    readOnly
                    value={`/s/${token}`}
                    onFocus={(e) => e.currentTarget.select()}
                    className="input font-mono text-xs"
                    aria-label={t.sharePanel.title}
                />
                <div className="flex shrink-0 gap-2">
                    <CopyButton text={link} label={t.sharePanel.copy} className="btn-primary flex-1 px-3 py-2" />
                    <button type="button" className="btn-ghost px-3 py-2" onClick={reset} disabled={busy}>
                        {t.sharePanel.reset}
                    </button>
                </div>
            </div>
            {note && <p className={note.ok ? 'text-xs text-moss' : 'field-error'}>{note.text}</p>}
        </section>
    );
}
