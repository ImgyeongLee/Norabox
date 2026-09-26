'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function DeletePostButton({ id }: { id: string }) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    async function remove() {
        if (!confirm("Delete this post? This can't be undone.")) return;
        setBusy(true);
        const res = await fetch(`/api/posts/${id}`, { method: 'DELETE' });
        if (res.ok) {
            router.push('/forum');
            router.refresh();
        } else {
            setBusy(false);
            alert('Could not delete the post');
        }
    }
    return (
        <button className="btn-danger px-3 py-2" onClick={remove} disabled={busy}>
            {busy ? 'Deleting…' : 'Delete'}
        </button>
    );
}
