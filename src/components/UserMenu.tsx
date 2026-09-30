'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { useI18n } from '@/i18n/client';

export function UserMenu({ username, avatarUrl }: { username: string; avatarUrl: string | null }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const { t } = useI18n();

    useEffect(() => {
        if (!open) return;
        const close = (e: MouseEvent | KeyboardEvent) => {
            if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node))
                setOpen(false);
        };
        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', close);
        return () => {
            document.removeEventListener('mousedown', close);
            document.removeEventListener('keydown', close);
        };
    }, [open]);

    async function logout() {
        await fetch('/api/auth/logout', { method: 'POST' });
        setOpen(false);
        router.push('/');
        router.refresh();
    }

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 transition hover:bg-fern/60"
                aria-haspopup="menu"
                aria-expanded={open}>
                <Avatar name={username} src={avatarUrl} />
                <span className="hidden max-w-32 truncate text-sm font-medium sm:inline">{username}</span>
            </button>
            {open && (
                <div role="menu" className="card absolute right-0 mt-2 w-48 overflow-hidden bg-pine/95 p-1 shadow-xl">
                    <Link
                        href="/profile"
                        role="menuitem"
                        onClick={() => setOpen(false)}
                        className="block rounded-lg px-3 py-2 text-sm hover:bg-fern">
                        {t.nav.profile}
                    </Link>
                    <Link
                        href="/playlists"
                        role="menuitem"
                        onClick={() => setOpen(false)}
                        className="block rounded-lg px-3 py-2 text-sm hover:bg-fern">
                        {t.nav.myPlaylists}
                    </Link>
                    <Link
                        href="/playlists/new"
                        role="menuitem"
                        onClick={() => setOpen(false)}
                        className="block rounded-lg px-3 py-2 text-sm hover:bg-fern">
                        {t.nav.newPlaylist}
                    </Link>
                    <Link
                        href="/liked"
                        role="menuitem"
                        onClick={() => setOpen(false)}
                        className="block rounded-lg px-3 py-2 text-sm hover:bg-fern">
                        {t.nav.liked}
                    </Link>
                    <button
                        role="menuitem"
                        onClick={logout}
                        className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-fern">
                        {t.nav.logout}
                    </button>
                </div>
            )}
        </div>
    );
}
