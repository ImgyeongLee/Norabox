'use client';

import { useState } from 'react';
import { useSendVerification } from '@/components/auth/useSendVerification';
import { useI18n } from '@/i18n/client';
import { VERIFY_LATER_COOKIE } from '@/lib/email-errors';

type Props = {
    email: string;
    /** A verification email was already sent. */
    sent: boolean;
    /** Today's email limit is reached: when sending works again (ISO). */
    quotaRetryAt: string | null;
};

/**
 * Along the bottom of every page, like a cookie banner, for members who haven't confirmed their
 * email address: accounts made before confirmation was required (new members can't log in until
 * they confirm). Until they do, they make at most one room and one playlist a day.
 */
export function VerifyEmailBanner({ email, sent: sentBefore, quotaRetryAt }: Props) {
    const { t } = useI18n();
    const { sent, busy, error, send, label } = useSendVerification(sentBefore, quotaRetryAt);
    const [hidden, setHidden] = useState(false);

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
                    <p className="mt-0.5 text-xs text-lime/60">{t.verify.bannerLimit}</p>
                    {error && (
                        <p role="alert" className="mt-1 text-danger">
                            {error}
                        </p>
                    )}
                </div>
                <div className="flex shrink-0 gap-2">
                    <button type="button" className="btn-primary" onClick={send} disabled={busy}>
                        {label}
                    </button>
                    <button type="button" className="btn-secondary" onClick={later}>
                        {t.verify.later}
                    </button>
                </div>
            </div>
        </div>
    );
}
