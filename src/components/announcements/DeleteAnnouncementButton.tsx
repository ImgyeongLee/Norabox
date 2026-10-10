'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useConfirm } from '@/components/ConfirmDialog';
import { useI18n } from '@/i18n/client';

export function DeleteAnnouncementButton({ id }: { id: string }) {
    const router = useRouter();
    const confirm = useConfirm();
    const { t, tError } = useI18n();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function remove() {
        const ok = await confirm({
            title: t.announcements.deleteTitle,
            body: t.announcements.deleteBody,
            confirmLabel: t.announcements.delete,
            danger: true,
        });
        if (!ok) return;
        setBusy(true);
        setError(null);
        const res = await fetch(`/api/announcements/${id}`, { method: 'DELETE' }).catch(() => null);
        if (res?.ok) {
            router.push('/announcements');
            router.refresh();
        } else {
            setBusy(false);
            setError(tError(res ? ((await res.json().catch(() => ({}))).error ?? 'generic') : 'network'));
        }
    }

    return (
        <span className="inline-flex flex-col items-end">
            <button className="btn-danger px-3 py-2" onClick={remove} disabled={busy}>
                {busy ? t.announcements.deleting : t.announcements.delete}
            </button>
            {error && (
                <span role="alert" className="mt-1 text-xs text-danger">
                    {error}
                </span>
            )}
        </span>
    );
}
