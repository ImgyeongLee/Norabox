'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useI18n } from '@/i18n/client';

export function DeletePostButton({ id }: { id: string }) {
    const router = useRouter();
    const { t, tError } = useI18n();
    const [busy, setBusy] = useState(false);
    async function remove() {
        if (!confirm(t.post.confirmDelete)) return;
        setBusy(true);
        const res = await fetch(`/api/posts/${id}`, { method: 'DELETE' });
        if (res.ok) {
            router.push('/forum');
            router.refresh();
        } else {
            setBusy(false);
            alert(tError('deletePostFailed'));
        }
    }
    return (
        <button className="btn-danger px-3 py-2" onClick={remove} disabled={busy}>
            {busy ? t.post.deleting : t.post.delete}
        </button>
    );
}
