'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Field } from '@/components/auth/Field';
import { Turnstile } from '@/components/auth/Turnstile';
import { useI18n } from '@/i18n/client';
import { emailErrorText } from '@/lib/email-errors';
import { useJsonForm } from '@/lib/use-json-form';

export function AuthForm({ mode, contactEmail = null }: { mode: 'login' | 'signup'; contactEmail?: string | null }) {
    const router = useRouter();
    const params = useSearchParams();
    const next = params.get('next');
    const redirectTo = next?.startsWith('/') && !next.startsWith('//') ? next : '/';
    const { errors: codes, busy, submit, retryAt } = useJsonForm();
    const { t, tError, locale } = useI18n();
    const [attempts, setAttempts] = useState(0);
    const errors = Object.fromEntries(Object.entries(codes).map(([k, v]) => [k, tError(v)]));
    // "Today's email limit is reached" (sign-up) also says when to come back.
    if (codes.form === 'emailQuota') errors.form = emailErrorText(t, locale, 'emailQuota', retryAt);

    async function onSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        const body = Object.fromEntries(new FormData(e.currentTarget));
        const ok = await submit(`/api/auth/${mode}`, body);
        if (ok && mode === 'signup') {
            // Not logged in yet: first they open the link in the confirmation email.
            router.push('/verify-email/pending');
        } else if (ok) {
            router.push(redirectTo);
            router.refresh();
        } else {
            // The bot-check token was used up; get a fresh one for the next try.
            setAttempts((n) => n + 1);
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
                {!isSignup && (
                    <p className="-mt-2 text-right text-sm">
                        <Link href="/forgot-password" className="font-semibold text-moss hover:underline">
                            {t.auth.forgotPassword}
                        </Link>
                    </p>
                )}
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
                {isSignup && (
                    <div>
                        <label className="flex cursor-pointer items-start gap-2 text-sm">
                            <input
                                type="checkbox"
                                name="ageConfirmed"
                                required
                                aria-invalid={!!errors.ageConfirmed}
                                aria-describedby={errors.ageConfirmed ? 'age-err' : undefined}
                                className="mt-0.5 size-4 shrink-0 accent-[var(--color-moss)]"
                            />
                            <span>{t.auth.ageConfirm}</span>
                        </label>
                        {errors.ageConfirmed && (
                            <p id="age-err" className="field-error">
                                {errors.ageConfirmed}
                            </p>
                        )}
                        {/* New tabs, so reading them doesn't lose what was typed here. */}
                        <p className="mt-2 text-xs text-lime/55">
                            {t.auth.consent.before}
                            <Link href="/terms" target="_blank" rel="noopener" className="font-semibold text-moss hover:underline">
                                {t.auth.consent.terms}
                            </Link>
                            {t.auth.consent.middle}
                            <Link href="/privacy" target="_blank" rel="noopener" className="font-semibold text-moss hover:underline">
                                {t.auth.consent.privacy}
                            </Link>
                            {t.auth.consent.after}
                        </p>
                    </div>
                )}
                {errors.form && !Object.keys(errors).some((k) => k !== 'form') && (
                    <div role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                        <p>{errors.form}</p>
                        {codes.form === 'emailNotVerified' && (
                            <p className="mt-1">
                                <Link href="/verify-email/pending" className="font-semibold underline underline-offset-2">
                                    {t.auth.resendVerification}
                                </Link>
                            </p>
                        )}
                        {codes.form === 'accountLocked' && (
                            <p className="mt-1">
                                <Link href="/forgot-password" className="font-semibold underline underline-offset-2">
                                    {t.auth.lockedReset.link}
                                </Link>
                                {t.auth.lockedReset.after}
                            </p>
                        )}
                        {codes.form === 'accountLocked' && (
                            <p className="mt-1">
                                {contactEmail ? (
                                    <>
                                        {t.auth.lockedNoEmail}{' '}
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
                <Turnstile resetKey={attempts} />
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
