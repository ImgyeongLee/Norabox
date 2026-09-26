'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getClientId } from '@/lib/client-identity';
import { roomCodeSchema } from '@/lib/validation';

function sanitize(v: string) {
    return v.replace(/[^A-Za-z0-9]/g, '').slice(0, 32);
}

export function CreateRoomForm() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        const parsed = roomCodeSchema.safeParse(name);
        if (!parsed.success) return setError(parsed.error.issues[0].message);
        setBusy(true);
        setError(null);
        try {
            const res = await fetch('/api/rooms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: parsed.data, clientId: getClientId() }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Could not create the room');
            router.push(`/room/${data.code}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not create the room');
            setBusy(false);
        }
    }

    return (
        <form onSubmit={submit} noValidate>
            <label htmlFor="room-name" className="label">
                Room name
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
                <input
                    id="room-name"
                    className="input font-mono"
                    placeholder="e.g. FridayVibes"
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
                />
                <button className="btn-primary shrink-0" disabled={busy || !name}>
                    {busy ? 'Creating…' : 'Create room'}
                </button>
            </div>
            <p id="room-name-hint" className={error ? 'field-error' : 'mt-1.5 text-xs text-lime/50'}>
                {error ?? 'Letters and numbers only. Your room name becomes its invite code.'}
            </p>
        </form>
    );
}

export function JoinRoomForm() {
    const router = useRouter();
    const [code, setCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!code) return;
        setBusy(true);
        setError(null);
        const res = await fetch(`/api/rooms/${encodeURIComponent(code)}`);
        if (res.ok) {
            const data = await res.json();
            router.push(`/room/${data.code}`);
        } else {
            setError('No room found with that invite code');
            setBusy(false);
        }
    }

    return (
        <form onSubmit={submit} noValidate>
            <label htmlFor="invite-code" className="label">
                Invite code
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
                <input
                    id="invite-code"
                    className="input font-mono"
                    placeholder="Paste an invite code"
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
                    {busy ? 'Joining…' : 'Join room'}
                </button>
            </div>
            {error && <p className="field-error">{error}</p>}
        </form>
    );
}
