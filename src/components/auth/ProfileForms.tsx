'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { Field } from '@/components/auth/Field';
import { useConfirm } from '@/components/ConfirmDialog';
import { useI18n } from '@/i18n/client';
import { useJsonForm } from '@/lib/use-json-form';

/** Translates a form's error codes for display. */
function useTranslatedErrors(codes: Record<string, string>) {
    const { tError } = useI18n();
    return Object.fromEntries(Object.entries(codes).map(([k, v]) => [k, tError(v)]));
}

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
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('imageInvalid'))), 'image/webp', 0.88),
    );
}

export function AvatarForm({ username, avatarUrl }: { username: string; avatarUrl: string | null }) {
    const router = useRouter();
    const { t, tError } = useI18n();
    const input = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

    async function upload(file: File) {
        setBusy(true);
        setMsg(null);
        try {
            if (!file.type.startsWith('image/')) throw new Error('imageInvalid');
            const form = new FormData();
            const blob = await toSquareImage(file);
            form.append('avatar', new File([blob], 'avatar.webp', { type: blob.type }));
            const res = await fetch('/api/profile/avatar', { method: 'POST', body: form });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setMsg({ ok: true, text: t.profile.imageUpdated });
            router.refresh();
        } catch (e) {
            setMsg({ ok: false, text: tError(e instanceof Error ? e.message : 'uploadFailed') });
        } finally {
            setBusy(false);
            if (input.current) input.current.value = '';
        }
    }

    async function remove() {
        setBusy(true);
        await fetch('/api/profile/avatar', { method: 'DELETE' });
        setBusy(false);
        setMsg({ ok: true, text: t.profile.imageRemoved });
        router.refresh();
    }

    return (
        <Section title={t.profile.image}>
            <div className="flex flex-wrap items-center gap-5">
                <Avatar name={username} src={avatarUrl} size="xl" />
                <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                        <button className="btn-primary" disabled={busy} onClick={() => input.current?.click()}>
                            {busy ? t.profile.uploading : avatarUrl ? t.profile.changeImage : t.profile.uploadImage}
                        </button>
                        {avatarUrl && (
                            <button className="btn-ghost" disabled={busy} onClick={remove}>
                                {t.profile.remove}
                            </button>
                        )}
                    </div>
                    <p className="text-xs text-lime/50">{t.profile.imageHint}</p>
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
    const { t } = useI18n();
    const { errors: codes, busy, submit } = useJsonForm();
    const errors = useTranslatedErrors(codes);
    const [value, setValue] = useState(username);
    const [saved, setSaved] = useState(false);

    async function onSubmit(e: React.SubmitEvent) {
        e.preventDefault();
        setSaved(false);
        if (await submit('/api/profile', { username: value }, 'PATCH')) {
            setSaved(true);
            router.refresh();
        }
    }

    return (
        <Section title={t.profile.username}>
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
                <Field
                    label={t.profile.username}
                    name="username"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    autoComplete="username"
                    error={errors.username ?? (errors.form && !errors.username ? errors.form : undefined)}
                />
                <div className="flex items-center gap-3">
                    <button className="btn-primary" disabled={busy || value.trim() === username}>
                        {busy ? t.common.saving : t.profile.saveUsername}
                    </button>
                    {saved && <Notice ok>{t.profile.usernameUpdated}</Notice>}
                </div>
            </form>
        </Section>
    );
}

export function PasswordForm() {
    const { t } = useI18n();
    const { errors: codes, busy, submit } = useJsonForm();
    const errors = useTranslatedErrors(codes);
    const [saved, setSaved] = useState(false);

    async function onSubmit(e: React.SubmitEvent<HTMLFormElement>) {
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
        <Section title={t.profile.changePassword}>
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
                <Field
                    label={t.profile.currentPassword}
                    name="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    error={errors.currentPassword}
                />
                <Field
                    label={t.profile.newPassword}
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    error={errors.newPassword}
                />
                <Field
                    label={t.profile.confirmNewPassword}
                    name="newPasswordConfirm"
                    type="password"
                    autoComplete="new-password"
                    error={errors.newPasswordConfirm}
                />
                {errors.form && !fieldKeys.some((k) => errors[k]) && <Notice ok={false}>{errors.form}</Notice>}
                <div className="flex items-center gap-3">
                    <button className="btn-primary" disabled={busy}>
                        {busy ? t.common.saving : t.profile.changePassword}
                    </button>
                    {saved && <Notice ok>{t.profile.passwordChanged}</Notice>}
                </div>
            </form>
        </Section>
    );
}

export function DeleteAccountForm() {
    const router = useRouter();
    const confirm = useConfirm();
    const { t } = useI18n();
    const { errors: codes, busy, submit } = useJsonForm();
    const errors = useTranslatedErrors(codes);
    const [password, setPassword] = useState('');

    async function onSubmit(e: React.SubmitEvent) {
        e.preventDefault();
        const ok = await confirm({
            title: t.profile.deleteConfirmTitle,
            body: t.profile.deleteConfirmBody,
            confirmLabel: t.profile.deleteAccount,
            danger: true,
        });
        if (!ok) return;
        if (await submit('/api/profile', { password }, 'DELETE')) {
            router.push('/');
            router.refresh();
        }
    }

    return (
        <section className="card border-danger/40 p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-danger">{t.profile.deleteAccount}</h2>
            <p className="mt-1 text-sm text-lime/65">{t.profile.deleteAccountBody}</p>
            <form onSubmit={onSubmit} className="mt-4 space-y-4" noValidate>
                <Field
                    label={t.profile.currentPassword}
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={errors.password}
                />
                {errors.form && !errors.password && <Notice ok={false}>{errors.form}</Notice>}
                <button className="btn-danger" disabled={busy || !password}>
                    {busy ? t.profile.deleting : t.profile.deleteAccount}
                </button>
            </form>
        </section>
    );
}
