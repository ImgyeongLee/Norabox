'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Field } from '@/components/auth/Field';
import { useI18n } from '@/i18n/client';
import { useJsonForm } from '@/lib/use-json-form';

/** On the page the reset email links to (its token is in a cookie, not the form). */
export function ResetPasswordForm() {
    const router = useRouter();
    const { errors: codes, busy, submit } = useJsonForm();
    const { t, tError } = useI18n();
    const errors = Object.fromEntries(Object.entries(codes).map(([k, v]) => [k, tError(v)]));

    async function onSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        if (await submit('/api/auth/password-reset', Object.fromEntries(new FormData(e.currentTarget)))) {
            router.push('/');
            router.refresh();
        }
    }

    return (
        <div className="card p-6 sm:p-8">
            <h1 className="text-2xl font-bold">{t.reset.title}</h1>
            <p className="mt-1 text-sm muted">{t.reset.lead}</p>
            <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
                <Field
                    label={t.reset.newPassword}
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    error={errors.password}
                />
                <Field
                    label={t.reset.confirmPassword}
                    name="passwordConfirm"
                    type="password"
                    autoComplete="new-password"
                    required
                    error={errors.passwordConfirm}
                />
                {errors.form && !errors.password && !errors.passwordConfirm && (
                    <div role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                        <p>{errors.form}</p>
                        {codes.form === 'resetLinkInvalid' && (
                            <Link href="/forgot-password" className="mt-1 inline-block font-semibold underline underline-offset-2">
                                {t.reset.requestNew}
                            </Link>
                        )}
                    </div>
                )}
                <button className="btn-primary w-full" disabled={busy}>
                    {busy ? t.auth.wait : t.reset.submit}
                </button>
            </form>
        </div>
    );
}
