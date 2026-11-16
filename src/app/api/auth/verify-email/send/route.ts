import { NextResponse } from 'next/server';
import { getI18n } from '@/i18n/server';
import { getCurrentUser } from '@/lib/auth';
import { appOrigin, emailErrorResponse, sendVerificationEmail } from '@/lib/email-flows';
import { jsonError } from '@/lib/http';
import { allowAttempt, clientIp } from '@/lib/rate-limit';

/** "Send verification email" in the banner shown to members who haven't confirmed their address. */
export async function POST(req: Request) {
    const me = await getCurrentUser();
    if (!me) return jsonError('loginRequired', 401);
    if (me.emailVerified) return jsonError('alreadyVerified', 409);
    if (!(await allowAttempt('email', clientIp(req)))) return jsonError('tooManyAttempts', 429);

    const { t } = await getI18n();
    const outcome = await sendVerificationEmail(me, t, appOrigin(req));
    return outcome.ok ? NextResponse.json({ ok: true }) : emailErrorResponse(outcome);
}
