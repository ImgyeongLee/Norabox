import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { getI18n } from '@/i18n/server';
import { startPending } from '@/lib/auth';
import { emailQuotaRetryAt } from '@/lib/email';
import { appOrigin, emailErrorResponse, sendVerificationEmail } from '@/lib/email-flows';
import { jsonError, readJson, validationError } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { allowAttempt, clientIp } from '@/lib/rate-limit';
import { turnstileToken, verifyTurnstile } from '@/lib/turnstile';
import { signupSchema } from '@/lib/validation';

export async function POST(req: Request) {
    const ip = clientIp(req);
    if (!(await allowAttempt('signup', ip))) return jsonError('tooManyAttempts', 429);
    const body = await readJson(req);
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    if (!(await verifyTurnstile(turnstileToken(body), ip))) return jsonError('botCheckFailed', 400);
    const { username, email, password } = parsed.data;

    const clash = await prisma.user.findFirst({
        where: { OR: [{ email }, { username }] },
        select: { email: true },
    });
    if (clash) {
        return clash.email === email
            ? jsonError('emailTaken', 409, { email: 'emailTaken' })
            : jsonError('usernameTaken', 409, { username: 'usernameTaken' });
    }

    // Signing up needs the confirmation email, so when today's emails are used up, say when to come back
    // rather than make an account that can't log in until then.
    const retryAt = await emailQuotaRetryAt();
    if (retryAt) return emailErrorResponse({ ok: false, error: 'emailQuota', retryAt: retryAt.toISOString() });

    const user = await prisma.user.create({
        data: { username, email, passwordHash: await bcrypt.hash(password, 12), emailVerificationRequired: true },
        select: { id: true, username: true, email: true },
    });
    // Not logged in until they open the link in the email; /verify-email/pending shows where it went
    // and can send it again.
    await startPending(user.id);
    const { t } = await getI18n();
    const verification = await sendVerificationEmail(user, t, appOrigin(req)).catch((e) => {
        console.error('[signup] verification email failed', e);
        return { ok: false, error: 'emailFailed' } as const;
    });
    return NextResponse.json({ ok: true, verification }, { status: 201 });
}
