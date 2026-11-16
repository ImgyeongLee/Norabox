'use client';

import { useState } from 'react';
import { useI18n } from '@/i18n/client';
import { emailErrorText } from '@/lib/email-errors';

/**
 * "Send the confirmation email (again)", shared by the banner and /verify-email/pending.
 * `quotaRetryAt`: today's emails are already used up (shown right away, with when to retry).
 */
export function useSendVerification(sentBefore: boolean, quotaRetryAt: string | null) {
    const { t, locale } = useI18n();
    const [sent, setSent] = useState(sentBefore);
    const [busy, setBusy] = useState(false);
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

    const label = busy ? t.verify.sending : sent ? t.verify.resend : t.verify.send;
    return { sent, busy, error, send, label };
}
