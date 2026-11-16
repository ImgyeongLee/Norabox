import { readResetToken, resetTokenMatches } from '@/lib/email-tokens';
import { RESET_LINK_TTL_SEC } from '@/lib/limits';
import { prisma } from '@/lib/prisma';
import { USER_ACTIVE } from '@/lib/users';

// The link in a password-reset email goes to /api/auth/password-reset, which moves its token into
// this cookie and sends the browser on to /reset-password. That way the token never sits in the
// address bar (where it would end up in history, analytics or a copied URL).
export const RESET_COOKIE = 'norabox_reset';

export const resetCookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: RESET_LINK_TTL_SEC,
};

/** The account a reset token may change the password of, or null if the link is invalid, expired or used. */
export async function resetTarget(token: unknown) {
    const claims = await readResetToken(token);
    if (!claims) return null;
    const user = await prisma.user.findUnique({
        where: { id: claims.userId, status: USER_ACTIVE },
        select: { id: true, passwordHash: true, emailVerifiedAt: true },
    });
    return user && resetTokenMatches(claims, user.passwordHash) ? user : null;
}
