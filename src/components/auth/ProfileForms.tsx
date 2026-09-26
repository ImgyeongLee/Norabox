'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { Field } from '@/components/auth/Field';
import { useJsonForm } from '@/lib/use-json-form';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="card p-5 sm:p-6">
            <h2 className="mb-4 text-lg font-semibold">{title}</h2>
            {children}
        </section>
    );
}

function Notice({ ok, children }: { ok: boolean; children: React.ReactNode }) {
    return <p className={ok ? 'text-sm text-moss' : 'field-error'}>{children}</p>;
}

/** Crops the image to a centred square and re-encodes it at 256×256. */
async function toSquareImage(file: File): Promise<Blob> {
    const bitmap = await createImageBitmap(file);
    const side = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    canvas
        .getContext('2d')!
        .drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 256, 256);
    bitmap.close();
    return new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process image'))), 'image/webp', 0.88),
    );
}

export function AvatarForm({ username, avatarUrl }: { username: string; avatarUrl: string | null }) {
    const router = useRouter();
    const input = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

    async function upload(file: File) {
        setBusy(true);
        setMsg(null);
        try {
            if (!file.type.startsWith('image/')) throw new Error('Choose an image file');
            const form = new FormData();
            const blob = await toSquareImage(file);
            form.append('avatar', new File([blob], 'avatar.webp', { type: blob.type }));
            const res = await fetch('/api/profile/avatar', { method: 'POST', body: form });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setMsg({ ok: true, text: 'Profile image updated' });
            router.refresh();
        } catch (e) {
            setMsg({ ok: false, text: e instanceof Error ? e.message : 'Upload failed' });
        } finally {
            setBusy(false);
            if (input.current) input.current.value = '';
        }
    }

    async function remove() {
        setBusy(true);
        await fetch('/api/profile/avatar', { method: 'DELETE' });
        setBusy(false);
        setMsg({ ok: true, text: 'Profile image removed' });
        router.refresh();
    }

    return (
        <Section title="Profile image">
            <div className="flex flex-wrap items-center gap-5">
                <Avatar name={username} src={avatarUrl} size="xl" />
                <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                        <button className="btn-primary" disabled={busy} onClick={() => input.current?.click()}>
                            {busy ? 'Uploading…' : avatarUrl ? 'Change image' : 'Upload image'}
                        </button>
                        {avatarUrl && (
                            <button className="btn-ghost" disabled={busy} onClick={remove}>
                                Remove
                            </button>
                        )}
                    </div>
                    <p className="text-xs text-lime/50">JPEG, PNG or WebP. We crop it to a square.</p>
                    {msg && <Notice ok={msg.ok}>{msg.text}</Notice>}
                </div>
                <input
                    ref={input}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
                />
            </div>
        </Section>
    );
}

export function UsernameForm({ username }: { username: string }) {
    const router = useRouter();
    const { errors, busy, submit } = useJsonForm();
    const [value, setValue] = useState(username);
    const [saved, setSaved] = useState(false);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaved(false);
        if (await submit('/api/profile', { username: value }, 'PATCH')) {
            setSaved(true);
            router.refresh();
        }
    }

    return (
        <Section title="Username">
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
                <Field
                    label="Username"
                    name="username"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    autoComplete="username"
                    error={errors.username ?? (errors.form && !errors.username ? errors.form : undefined)}
                />
                <div className="flex items-center gap-3">
                    <button className="btn-primary" disabled={busy || value.trim() === username}>
                        {busy ? 'Saving…' : 'Save username'}
                    </button>
                    {saved && <Notice ok>Username updated</Notice>}
                </div>
            </form>
        </Section>
    );
}

export function PasswordForm() {
    const { errors, busy, submit } = useJsonForm();
    const [saved, setSaved] = useState(false);

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaved(false);
        const form = e.currentTarget;
        if (await submit('/api/profile/password', Object.fromEntries(new FormData(form)))) {
            setSaved(true);
            form.reset();
        }
    }

    const fieldKeys = ['currentPassword', 'newPassword', 'newPasswordConfirm'];
    return (
        <Section title="Change password">
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
                <Field
                    label="Current password"
                    name="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    error={errors.currentPassword}
                />
                <Field
                    label="New password"
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    error={errors.newPassword}
                />
                <Field
                    label="Confirm new password"
                    name="newPasswordConfirm"
                    type="password"
                    autoComplete="new-password"
                    error={errors.newPasswordConfirm}
                />
                {errors.form && !fieldKeys.some((k) => errors[k]) && <Notice ok={false}>{errors.form}</Notice>}
                <div className="flex items-center gap-3">
                    <button className="btn-primary" disabled={busy}>
                        {busy ? 'Saving…' : 'Change password'}
                    </button>
                    {saved && <Notice ok>Password changed</Notice>}
                </div>
            </form>
        </Section>
    );
}
