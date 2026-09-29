'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useConfirm } from '@/components/ConfirmDialog';
import { useI18n } from '@/i18n/client';

export function DeletePostButton({ id }: { id: string }) {
    const router = useRouter();
    const confirm = useConfirm();
    const { t, tError } = useI18n();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function remove() {
        const ok = await confirm({
            title: t.post.deleteTitle,
            body: t.post.deleteBody,
            confirmLabel: t.post.delete,
            danger: true,
        });
        if (!ok) return;
        setBusy(true);
        setError(null);
        const res = await fetch(`/api/posts/${id}`, { method: 'DELETE' }).catch(() => null);
        if (res?.ok) {
            router.push('/forum');
            router.refresh();
        } else {
            setBusy(false);
            setError(tError('deletePostFailed'));
        }
    }

    return (
        <span className="inline-flex flex-col items-end">
            <button className="btn-danger px-3 py-2" onClick={remove} disabled={busy}>
                {busy ? t.post.deleting : t.post.delete}
            </button>
            {error && (
                <span role="alert" className="mt-1 text-xs text-danger">
                    {error}
                </span>
            )}
        </span>
    );
}
