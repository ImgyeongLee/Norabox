'use client';

import Link from '@/components/AppLink';
import { useState } from 'react';
import { Field } from '@/components/auth/Field';
import { Turnstile } from '@/components/auth/Turnstile';
import { useI18n } from '@/i18n/client';
import { emailErrorText } from '@/lib/email-errors';
import { useJsonForm } from '@/lib/use-json-form';

/** "Forgot your password?": emails a link to choose a new one (which also unlocks a locked account). */
export function ForgotPasswordForm() {
    const { errors: codes, busy, submit, retryAt } = useJsonForm();
    const { t, tError, locale } = useI18n();
    const [attempts, setAttempts] = useState(0);
    const [sentTo, setSentTo] = useState<string | null>(null);

    async function onSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        const body = Object.fromEntries(new FormData(e.currentTarget));
        if (await submit('/api/auth/password-reset/request', body)) setSentTo(String(body.email).trim());
        // The bot-check token is used up either way; get a fresh one for another try.
        setAttempts((n) => n + 1);
    }

    const formError = codes.form && !codes.email ? emailErrorText(t, locale, codes.form, retryAt) : null;

    return (
        <div className="card p-6 sm:p-8">
            <h1 className="text-2xl font-bold">{t.forgot.title}</h1>
            {sentTo ? (
                <div role="status" className="mt-4 space-y-2 text-sm">
                    <p>{t.forgot.sent(sentTo)}</p>
                    <p className="muted">{t.forgot.checkSpam}</p>
                </div>
            ) : (
                <>
                    <p className="mt-1 text-sm muted">{t.forgot.lead}</p>
                    <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
                        <Field
                            label={t.auth.email}
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            error={codes.email ? tError(codes.email) : undefined}
                        />
                        {formError && (
                            <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                                {formError}
                            </p>
                        )}
                        <Turnstile resetKey={attempts} />
                        <button className="btn-primary w-full" disabled={busy}>
                            {busy ? t.auth.wait : t.forgot.submit}
                        </button>
                    </form>
                </>
            )}
            <p className="mt-6 text-center text-sm">
                <Link href="/login" className="font-semibold text-moss hover:underline">
                    {t.forgot.backToLogin}
                </Link>
            </p>
        </div>
    );
}
