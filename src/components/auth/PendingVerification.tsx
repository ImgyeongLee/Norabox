'use client';

import { useSendVerification } from '@/components/auth/useSendVerification';
import { useI18n } from '@/i18n/client';

/** "Check your email" for a new member, who can log in once they open the link. */
export function PendingVerification({
    email,
    sent: sentBefore,
    quotaRetryAt,
}: {
    email: string;
    sent: boolean;
    quotaRetryAt: string | null;
}) {
    const { t } = useI18n();
    const { sent, busy, error, send, label } = useSendVerification(sentBefore, quotaRetryAt);
    return (
        <div className="card p-6 sm:p-8">
            <h1 className="text-2xl font-bold">{t.verify.pendingTitle}</h1>
            <p role="status" className="mt-2 text-sm">
                {sent ? t.verify.pendingSent(email) : t.verify.pendingNotSent(email)}
            </p>
            <p className="mt-2 text-sm muted">{t.verify.pendingHint}</p>
            {error && (
                <p role="alert" className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                    {error}
                </p>
            )}
            <button type="button" className="btn-primary mt-6 w-full" onClick={send} disabled={busy}>
                {label}
            </button>
        </div>
    );
}
