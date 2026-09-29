'use client';

/* eslint-disable @next/next/no-img-element -- YouTube thumbnail */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useI18n } from '@/i18n/client';
import { getClientId } from '@/lib/client-identity';
import { roomCodeSchema } from '@/lib/validation';

function sanitize(v: string) {
    return v.replace(/[^A-Za-z0-9]/g, '').slice(0, 32);
}

/** A forum playlist being imported into the new room (from a post's Import button). */
export type ImportingPlaylist = {
    id: string;
    title: string;
    songCount: number;
    thumbnail: string | null;
    scenario: string | null;
};

export function CreateRoomForm({ importing }: { importing?: ImportingPlaylist | null }) {
    const router = useRouter();
    const { t, tError } = useI18n();
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    async function submit(e: React.SubmitEvent) {
        e.preventDefault();
        const parsed = roomCodeSchema.safeParse(name);
        if (!parsed.success) return setError(tError(parsed.error.issues[0].message));
        setBusy(true);
        setError(null);
        try {
            const res = await fetch('/api/rooms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: parsed.data,
                    clientId: getClientId(),
                    ...(importing ? { importPostId: importing.id } : {}),
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'createRoomFailed');
            router.push(`/room/${data.code}`);
        } catch (err) {
            setError(tError(err instanceof Error ? err.message : 'createRoomFailed'));
            setBusy(false);
        }
    }

    return (
        <form onSubmit={submit} noValidate>
            {importing && (
                <div className="mb-4 flex items-center gap-3 rounded-xl border border-moss/50 bg-moss/10 p-3">
                    {importing.thumbnail && (
                        <img src={importing.thumbnail} alt="" className="aspect-video w-20 shrink-0 rounded-md object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-moss">{t.home.importing}</p>
                        <p className="truncate text-sm font-semibold">{importing.title}</p>
                        <p className="truncate text-xs text-lime/55">
                            {importing.scenario ? `${importing.scenario} · ` : ''}
                            {t.common.songs(importing.songCount)}
                        </p>
                    </div>
                    <Link href="/" replace scroll={false} className="btn-ghost shrink-0 px-2.5 py-1.5 text-xs">
                        {t.home.cancelImport}
                    </Link>
                </div>
            )}
            <label htmlFor="room-name" className="label">
                {t.roomForms.roomName}
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
                <input
                    id="room-name"
                    className="input font-mono"
                    placeholder={t.roomForms.roomNamePlaceholder}
                    value={name}
                    onChange={(e) => {
                        setName(sanitize(e.target.value));
                        setError(null);
                    }}
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={32}
                    aria-invalid={!!error}
                    aria-describedby="room-name-hint"
                    autoFocus={!!importing}
                />
                <button className="btn-primary shrink-0" disabled={busy || !name}>
                    {busy ? t.roomForms.creating : t.roomForms.create}
                </button>
            </div>
            <p id="room-name-hint" className={error ? 'field-error' : 'mt-1.5 text-xs text-lime/50'}>
                {error ?? (importing ? `${t.roomForms.roomNameHint} ${t.home.importHint}` : t.roomForms.roomNameHint)}
            </p>
        </form>
    );
}

export function JoinRoomForm() {
    const router = useRouter();
    const { t, tError } = useI18n();
    const [code, setCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    async function submit(e: React.SubmitEvent) {
        e.preventDefault();
        if (!code) return;
        setBusy(true);
        setError(null);
        const res = await fetch(`/api/rooms/${encodeURIComponent(code)}`);
        if (res.ok) {
            const data = await res.json();
            router.push(`/room/${data.code}`);
        } else {
            setError(tError('inviteNotFound'));
            setBusy(false);
        }
    }

    return (
        <form onSubmit={submit} noValidate>
            <label htmlFor="invite-code" className="label">
                {t.roomForms.inviteCode}
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
                <input
                    id="invite-code"
                    className="input font-mono"
                    placeholder={t.roomForms.invitePlaceholder}
                    value={code}
                    onChange={(e) => {
                        setCode(sanitize(e.target.value));
                        setError(null);
                    }}
                    autoComplete="off"
                    spellCheck={false}
                    aria-invalid={!!error}
                />
                <button className="btn-secondary shrink-0" disabled={busy || !code}>
                    {busy ? t.roomForms.joining : t.roomForms.join}
                </button>
            </div>
            {error && <p className="field-error">{error}</p>}
        </form>
    );
}
