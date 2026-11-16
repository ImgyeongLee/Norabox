import type { Locale } from '@/i18n/config';
import { translateError, type Messages } from '@/i18n/messages';
import { formatKst } from '@/lib/format';

/**
 * Set by "Later" on the verify-your-email banner. A session cookie, so the banner comes back the
 * next time the browser opens.
 */
export const VERIFY_LATER_COOKIE = 'norabox_verify_later';

/**
 * The message for an error from an email-sending API. "Today's email limit is reached" also says
 * when emails can be sent again, in Korea time.
 */
export function emailErrorText(t: Messages, locale: Locale, code: string | null | undefined, retryAt?: string | null) {
    if (code === 'emailQuota' && retryAt) {
        const at = new Date(retryAt);
        if (!Number.isNaN(at.getTime())) return t.email.quota(formatKst(at, locale));
    }
    return translateError(t, code);
}
