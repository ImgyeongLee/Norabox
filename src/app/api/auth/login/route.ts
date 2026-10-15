import { NextResponse } from 'next/server';
import { startSession } from '@/lib/auth';
import { jsonError, readJson, validationError } from '@/lib/http';
import { checkLogin } from '@/lib/login';
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
    await startSession(result.userId);
    return NextResponse.json({ ok: true });
}
