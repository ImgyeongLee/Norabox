'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Field } from '@/components/auth/Field';
import { useI18n } from '@/i18n/client';
import { useJsonForm } from '@/lib/use-json-form';

export function AuthForm({ mode, contactEmail = null }: { mode: 'login' | 'signup'; contactEmail?: string | null }) {
    const router = useRouter();
    const params = useSearchParams();
    const next = params.get('next');
    const redirectTo = next?.startsWith('/') && !next.startsWith('//') ? next : '/';
    const { errors: codes, busy, submit } = useJsonForm();
    const { t, tError } = useI18n();
    const errors = Object.fromEntries(Object.entries(codes).map(([k, v]) => [k, tError(v)]));

    async function onSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        const body = Object.fromEntries(new FormData(e.currentTarget));
        const ok = await submit(`/api/auth/${mode}`, body);
        if (ok) {
            router.push(redirectTo);
            router.refresh();
        }
    }

    const isSignup = mode === 'signup';
    const other = isSignup ? '/login' : '/signup';
    const otherHref = next ? `${other}?next=${encodeURIComponent(next)}` : other;

    return (
        <div className="card p-6 sm:p-8">
            <h1 className="text-2xl font-bold">{isSignup ? t.auth.signupTitle : t.auth.loginTitle}</h1>
            <p className="mt-1 text-sm muted">
                {isSignup ? t.auth.signupLead : t.auth.loginLead}
            </p>
            <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
                {isSignup && (
                    <Field label={t.auth.username} name="username" autoComplete="username" required error={errors.username} />
                )}
                <Field
                    label={t.auth.email}
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    error={errors.email}
                />
                <Field
                    label={t.auth.password}
                    name="password"
                    type="password"
                    autoComplete={isSignup ? 'new-password' : 'current-password'}
                    required
                    error={errors.password}
                />
                {isSignup && (
                    <Field
                        label={t.auth.passwordConfirm}
                        name="passwordConfirm"
                        type="password"
                        autoComplete="new-password"
                        required
                        error={errors.passwordConfirm}
                    />
                )}
                {errors.form && !Object.keys(errors).some((k) => k !== 'form') && (
                    <div role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                        <p>{errors.form}</p>
                        {codes.form === 'accountLocked' && (
                            <p className="mt-1">
                                {contactEmail ? (
                                    <>
                                        {t.auth.lockedContact}{' '}
                                        <a
                                            href={`mailto:${contactEmail}?subject=${encodeURIComponent(t.auth.lockedSubject)}`}
                                            className="font-semibold underline underline-offset-2"
                                        >
                                            {contactEmail}
                                        </a>
                                    </>
                                ) : (
                                    t.auth.lockedNoContact
                                )}
                            </p>
                        )}
                    </div>
                )}
                <button className="btn-primary w-full" disabled={busy}>
                    {busy ? t.auth.wait : isSignup ? t.auth.submitSignup : t.auth.submitLogin}
                </button>
            </form>
            <p className="mt-6 text-center text-sm muted">
                {isSignup ? t.auth.haveAccount : t.auth.newHere}
                <Link href={otherHref} className="font-semibold text-moss hover:underline">
                    {isSignup ? t.auth.submitLogin : t.auth.submitSignup}
                </Link>
            </p>
        </div>
    );
}
