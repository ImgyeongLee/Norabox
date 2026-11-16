import { NextResponse } from 'next/server';
import { getI18n } from '@/i18n/server';
import { getCurrentUser, getPendingUser } from '@/lib/auth';
import { appOrigin, emailErrorResponse, sendVerificationEmail } from '@/lib/email-flows';
import { jsonError } from '@/lib/http';
import { allowAttempt, clientIp } from '@/lib/rate-limit';

/**
 * Sends the confirmation email (again): from the banner for logged-in members who haven't
 * confirmed, or from /verify-email/pending for new members, who aren't logged in until they do.
 */
export async function POST(req: Request) {
    const me = await getCurrentUser();
    const pending = me ? null : await getPendingUser();
    const user = me ?? pending;
    if (!user) return jsonError('loginRequired', 401);
    if (me ? me.emailVerified : pending?.emailVerifiedAt) return jsonError('alreadyVerified', 409);
    if (!(await allowAttempt('email', clientIp(req)))) return jsonError('tooManyAttempts', 429);

    const { t } = await getI18n();
    const outcome = await sendVerificationEmail(user, t, appOrigin(req));
    return outcome.ok ? NextResponse.json({ ok: true }) : emailErrorResponse(outcome);
}
