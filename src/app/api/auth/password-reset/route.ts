import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { startSession } from '@/lib/auth';
import { jsonError, readJson, validationError } from '@/lib/http';
import { RESET_COOKIE, resetCookieOptions, resetTarget } from '@/lib/password-reset';
import { prisma } from '@/lib/prisma';
import { resetPasswordSchema } from '@/lib/validation';

/** The link in the reset email: keeps its token in a cookie and opens the "choose a new password" page. */
export async function GET(req: Request) {
    const token = new URL(req.url).searchParams.get('token');
    const valid = token && (await resetTarget(token));
    const res = NextResponse.redirect(new URL(valid ? '/reset-password' : '/reset-password?status=invalid', req.url), 303);
    if (valid) res.cookies.set(RESET_COOKIE, token, resetCookieOptions);
    else res.cookies.delete(RESET_COOKIE);
    return res;
}

/**
 * Sets the new password. It also unlocks the account (locked after too many wrong passwords) and
 * confirms the email address, since only its owner could open the link. Then they're logged in.
 */
export async function POST(req: Request) {
    const store = await cookies();
    const user = await resetTarget(store.get(RESET_COOKIE)?.value);
    if (!user) return jsonError('resetLinkInvalid', 400);
    const parsed = resetPasswordSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);

    // Only if the password is still the one the link was made for, so the link works once.
    const { count } = await prisma.user.updateMany({
        where: { id: user.id, passwordHash: user.passwordHash },
        data: {
            passwordHash: await bcrypt.hash(parsed.data.password, 12),
            failedLogins: 0,
            lockedAt: null,
            emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
        },
    });
    store.delete(RESET_COOKIE);
    if (count === 0) return jsonError('resetLinkInvalid', 400);
    await startSession(user.id);
    return NextResponse.json({ ok: true });
}
