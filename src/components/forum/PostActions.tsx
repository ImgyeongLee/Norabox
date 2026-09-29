'use client';

import Link from 'next/link';
import { useState } from 'react';
import { HeartIcon, ImportIcon, ShareIcon } from '@/components/icons-extra';
import { useI18n } from '@/i18n/client';

type Props = { postId: string; signedIn: boolean; liked: boolean; likeCount: number };

const pill = 'btn-secondary gap-2 px-3.5 py-2';
const active = 'border-moss bg-moss/20 text-lime';

/**
 * Like (signed-in only; builds the multi-playlist Liked collection), Share (copy link)
 * and Import (start a new room with this one playlist).
 */
export function PostActions({ postId, signedIn, ...initial }: Props) {
    const { t, tError } = useI18n();
    const [like, setLike] = useState({ liked: initial.liked, count: initial.likeCount });
    const [busy, setBusy] = useState(false);
    const [note, setNote] = useState<string | null>(null);

    function flash(text: string) {
        setNote(text);
        setTimeout(() => setNote((n) => (n === text ? null : n)), 3500);
    }

    async function toggleLike() {
        if (busy) return;
        const next = !like.liked;
        const prev = like;
        setLike({ liked: next, count: like.count + (next ? 1 : -1) }); // optimistic
        setBusy(true);
        try {
            const res = await fetch(`/api/posts/${postId}/like`, { method: next ? 'POST' : 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setLike({ liked: data.liked, count: data.count });
        } catch (e) {
            setLike(prev);
            flash(tError(e instanceof Error ? e.message : 'generic'));
        } finally {
            setBusy(false);
        }
    }

    async function share() {
        const url = `${window.location.origin}/forum/${postId}`;
        try {
            await navigator.clipboard.writeText(url);
        } catch {
            // Clipboard API can be unavailable on insecure origins (e.g. LAN IP in dev).
            const ta = document.createElement('textarea');
            ta.value = url;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
        }
        flash(t.post.linkCopied);
    }


    const heart = (
        <>
            <HeartIcon filled={like.liked} className={`size-5 ${like.liked ? 'text-danger' : ''}`} />
            <span>{t.post.like}</span>
            <span className="font-mono text-xs text-lime/60">{like.count}</span>
        </>
    );

    return (
        <div>
            <div className="flex flex-wrap gap-2">
                {signedIn ? (
                    <button
                        type="button"
                        onClick={toggleLike}
                        aria-pressed={like.liked}
                        aria-label={like.liked ? t.post.unlike : t.post.like}
                        className={`${pill} ${like.liked ? active : ''}`}
                    >
                        {heart}
                    </button>
                ) : (
                    <Link
                        href={`/login?next=${encodeURIComponent(`/forum/${postId}`)}`}
                        title={t.post.loginToLike}
                        aria-label={t.post.loginToLike}
                        className={pill}
                    >
                        {heart}
                    </Link>
                )}
                <button type="button" onClick={share} className={pill}>
                    <ShareIcon />
                    <span>{t.post.share}</span>
                </button>
                <Link href={`/?import=${postId}#start-room`} title={t.post.importTitle} className={pill}>
                    <ImportIcon />
                    <span>{t.post.import}</span>
                </Link>
            </div>
            <p role="status" className="mt-2 min-h-5 text-sm text-moss">
                {note}
            </p>
        </div>
    );
}
