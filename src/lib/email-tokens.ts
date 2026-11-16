import { createHash } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { RESET_LINK_TTL_SEC, VERIFY_LINK_TTL_SEC } from '@/lib/limits';
import { secretKey } from '@/lib/session';

// Signed tokens for the links in emails, so no token table is needed. Each kind has its own
// audience, so a verification link can't be used as a password-reset link (or a session).
//
// - Verification: names the account and its email address.
// - Password reset: also carries a fingerprint of the current password hash, so the link stops
//   working as soon as the password changes: it can be used once.

const VERIFY_AUD = 'norabox:verify-email';
const RESET_AUD = 'norabox:reset-password';

/** A short, non-reversible fingerprint of a bcrypt hash. */
const fingerprint = (passwordHash: string) => createHash('sha256').update(passwordHash).digest('base64url').slice(0, 22);

function sign(userId: string, audience: string, maxAge: number, claims: Record<string, string>) {
    return new SignJWT(claims)
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(userId)
        .setAudience(audience)
        .setIssuedAt()
        .setExpirationTime(`${maxAge}s`)
        .sign(secretKey());
}

async function verify(token: unknown, audience: string) {
    if (typeof token !== 'string' || !token || token.length > 2048) return null;
    try {
        const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'], audience });
        return typeof payload.sub === 'string' ? payload : null;
    } catch {
        return null;
    }
}

export const signVerifyToken = (userId: string, email: string) =>
    sign(userId, VERIFY_AUD, VERIFY_LINK_TTL_SEC, { email });

/** The account and email a verification link is for, or null if it's invalid or expired. */
export async function readVerifyToken(token: unknown) {
    const p = await verify(token, VERIFY_AUD);
    return p && typeof p.email === 'string' ? { userId: p.sub!, email: p.email } : null;
}

export const signResetToken = (userId: string, passwordHash: string) =>
    sign(userId, RESET_AUD, RESET_LINK_TTL_SEC, { pw: fingerprint(passwordHash) });

/** The account a reset link is for, or null if it's invalid or expired. */
export async function readResetToken(token: unknown) {
    const p = await verify(token, RESET_AUD);
    return p && typeof p.pw === 'string' ? { userId: p.sub!, pw: p.pw } : null;
}

/** Whether a reset link was made for this password: false once the password has changed. */
export const resetTokenMatches = (token: { pw: string }, passwordHash: string) => token.pw === fingerprint(passwordHash);
