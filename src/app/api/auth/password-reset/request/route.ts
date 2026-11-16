import { NextResponse } from 'next/server';
import { getI18n } from '@/i18n/server';
import { appOrigin, emailErrorResponse, sendPasswordResetEmail } from '@/lib/email-flows';
import { jsonError, readJson, validationError } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { allowAttempt, clientIp } from '@/lib/rate-limit';
import { turnstileToken, verifyTurnstile } from '@/lib/turnstile';
import { USER_ACTIVE } from '@/lib/users';
import { forgotPasswordSchema } from '@/lib/validation';

/** "Forgot your password?": emails a reset link to the account with this address. */
export async function POST(req: Request) {
    const ip = clientIp(req);
    if (!(await allowAttempt('email', ip))) return jsonError('tooManyAttempts', 429);
    const body = await readJson(req);
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    if (!(await verifyTurnstile(turnstileToken(body), ip))) return jsonError('botCheckFailed', 400);

    const user = await prisma.user.findUnique({
        where: { email: parsed.data.email, status: USER_ACTIVE },
        select: { id: true, username: true, email: true, passwordHash: true },
    });
    // Said plainly (by request), rather than "if an account exists, we sent a link".
    if (!user) return jsonError('emailNotFound', 404, { email: 'emailNotFound' });

    const { t } = await getI18n();
    const outcome = await sendPasswordResetEmail(user, t, appOrigin(req));
    return outcome.ok ? NextResponse.json({ ok: true }) : emailErrorResponse(outcome);
}
