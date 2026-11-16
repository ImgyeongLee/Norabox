'use client';

import { useState } from 'react';
import { useI18n } from '@/i18n/client';
import { emailErrorText, VERIFY_LATER_COOKIE } from '@/lib/email-errors';

type Props = {
    email: string;
    /** A verification email was already sent (e.g. at sign-up). */
    sent: boolean;
    /** Today's email limit is reached: when sending works again (ISO). */
    quotaRetryAt: string | null;
};

/**
 * Along the bottom of every page, like a cookie banner, for members who haven't confirmed their
 * email address yet: accounts made before verification existed, and new ones until they open the link.
 */
export function VerifyEmailBanner({ email, sent: sentBefore, quotaRetryAt }: Props) {
    const { t, locale } = useI18n();
    const [sent, setSent] = useState(sentBefore);
    const [busy, setBusy] = useState(false);
    const [hidden, setHidden] = useState(false);
    const [error, setError] = useState<string | null>(
        quotaRetryAt ? emailErrorText(t, locale, 'emailQuota', quotaRetryAt) : null,
    );

    async function send() {
        setBusy(true);
        setError(null);
        try {
            const res = await fetch('/api/auth/verify-email/send', { method: 'POST' });
            const data = await res.json().catch(() => ({}));
            if (res.ok || data.error === 'alreadyVerified') setSent(true);
            else setError(emailErrorText(t, locale, data.error, data.retryAt));
        } catch {
            setError(t.errors.network);
        } finally {
            setBusy(false);
        }
    }

    function later() {
        document.cookie = `${VERIFY_LATER_COOKIE}=1; path=/; samesite=lax`;
        setHidden(true);
    }

    if (hidden) return null;
    return (
        <div
            role="region"
            aria-label={t.meta.verifyEmail}
            className="fixed inset-x-0 bottom-0 z-40 border-t border-leaf/50 bg-pine/95 px-4 py-3 shadow-2xl backdrop-blur"
        >
            <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1 text-sm">
                    <p className="break-words">{sent ? t.verify.bannerSent(email) : t.verify.bannerAsk}</p>
                    {error && (
                        <p role="alert" className="mt-1 text-danger">
                            {error}
                        </p>
                    )}
                </div>
                <div className="flex shrink-0 gap-2">
                    <button type="button" className="btn-primary" onClick={send} disabled={busy}>
                        {busy ? t.verify.sending : sent ? t.verify.resend : t.verify.send}
                    </button>
                    <button type="button" className="btn-secondary" onClick={later}>
                        {t.verify.later}
                    </button>
                </div>
            </div>
        </div>
    );
}
