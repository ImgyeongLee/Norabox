'use client';

/* eslint-disable @next/next/no-img-element -- YouTube thumbnail */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LuArrowRight } from 'react-icons/lu';
import { Icon } from '@/components/icons';
import { useI18n } from '@/i18n/client';
import { roomCodeSchema } from '@/lib/validation';

function sanitize(v: string) {
    return v.replace(/[^A-Za-z0-9]/g, '').slice(0, 32);
}

/** A forum playlist being imported into the new room (from a post's Import button). */
export type ImportingPlaylist = {
    id: string;
    /** Present when importing someone else's link-only playlist through its share link. */
    shareToken: string | null;
    title: string;
    songCount: number;
    thumbnail: string | null;
    scenario: string | null;
};

/**
 * Step 1 of starting a room: its name (which is also its invite code). "Next" checks that the
 * name is free, then hands it to step 2, where the theme is picked with a preview
 * (src/components/home/ThemeStep.tsx) and the room is created.
 */
export function CreateRoomForm({
    importing,
    initialName = '',
    initialError = null,
    onNext,
}: {
    importing?: ImportingPlaylist | null;
    /** Kept when coming back from step 2. */
    initialName?: string;
    /** Shown when step 2 found the name taken after all. */
    initialError?: string | null;
    onNext: (name: string) => void;
}) {
    const { t, tError } = useI18n();
    const [name, setName] = useState(initialName);
    const [error, setError] = useState<string | null>(initialError);
    const [busy, setBusy] = useState(false);

    async function submit(e: React.SubmitEvent) {
        e.preventDefault();
        const parsed = roomCodeSchema.safeParse(name);
        if (!parsed.success) return setError(tError(parsed.error.issues[0].message));
        setBusy(true);
        setError(null);
        // A room with this name already? (The lookup the join form uses; 404 means it's free.) If the
        // check itself fails, go on: creating the room checks again.
        const res = await fetch(`/api/rooms/${encodeURIComponent(parsed.data)}`).catch(() => null);
        setBusy(false);
        if (res?.ok) return setError(tError('roomNameTaken'));
        onNext(parsed.data);
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
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <label htmlFor="room-name" className="text-sm font-medium text-lime/85">
                    {t.roomForms.roomName}
                </label>
                <span className="text-xs text-lime/70">
                    <b className="text-moss">1</b> / 2 · {t.roomForms.stepName}
                </span>
            </div>
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
                    aria-invalid={!!error}
                    aria-describedby="room-name-hint"
                    autoFocus={!!importing || !!initialName}
                />
                <button className="btn-primary shrink-0" disabled={busy || !name}>
                    {busy ? t.roomForms.checking : t.roomForms.next}
                    {!busy && <Icon as={LuArrowRight} className="size-4" />}
                </button>
            </div>
            <p id="room-name-hint" className={error ? 'field-error' : 'mt-1.5 text-xs text-lime/50'}>
                {error ??
                    `${t.roomForms.roomNameHint} ${importing ? t.home.importHint : t.roomForms.nextHint}`}
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
