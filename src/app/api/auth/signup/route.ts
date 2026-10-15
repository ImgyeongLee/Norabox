import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { startSession } from '@/lib/auth';
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

    const user = await prisma.user.create({
        data: { username, email, passwordHash: await bcrypt.hash(password, 12) },
        select: { id: true },
    });
    await startSession(user.id);
    return NextResponse.json({ ok: true }, { status: 201 });
}
