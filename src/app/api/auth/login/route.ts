import { NextResponse } from 'next/server';
import { mustVerifyFirst, startPending, startSession } from '@/lib/auth';
import { jsonError, readJson, validationError } from '@/lib/http';
import { checkLogin } from '@/lib/login';
import { prisma } from '@/lib/prisma';
import { allowAttempt, clientIp } from '@/lib/rate-limit';
import { turnstileToken, verifyTurnstile } from '@/lib/turnstile';
import { loginSchema } from '@/lib/validation';

export async function POST(req: Request) {
    const ip = clientIp(req);
    if (!(await allowAttempt('login', ip))) return jsonError('tooManyAttempts', 429);
    const body = await readJson(req);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    if (!(await verifyTurnstile(turnstileToken(body), ip))) return jsonError('botCheckFailed', 400);
    const { email, password } = parsed.data;

    const result = await checkLogin(email, password);
    if (!result.ok) return jsonError(result.error, result.error === 'accountLocked' ? 423 : 401);
    // Right password, but a new member who hasn't confirmed their email yet: no session.
    const user = await prisma.user.findUniqueOrThrow({
        where: { id: result.userId },
        select: { emailVerificationRequired: true, emailVerifiedAt: true },
    });
    if (mustVerifyFirst(user)) {
        await startPending(result.userId);
        return jsonError('emailNotVerified', 403);
    }
    await startSession(result.userId);
    return NextResponse.json({ ok: true });
}
