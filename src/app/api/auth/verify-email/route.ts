import { NextResponse } from 'next/server';
import { endPending, startSession } from '@/lib/auth';
import { readVerifyToken } from '@/lib/email-tokens';
import { prisma } from '@/lib/prisma';
import { USER_ACTIVE } from '@/lib/users';

// The link in the verification email. Marks the address as confirmed and logs the member in (only
// the address's owner could open it; for new members this finishes signing up), then shows
// /verify-email with the outcome (the token stays out of the page's address).
export async function GET(req: Request) {
    const claims = await readVerifyToken(new URL(req.url).searchParams.get('token'));
    let ok = false;
    if (claims) {
        const where = { id: claims.userId, email: claims.email, status: USER_ACTIVE };
        await prisma.user.updateMany({ where: { ...where, emailVerifiedAt: null }, data: { emailVerifiedAt: new Date() } });
        // Opening the link a second time still says "confirmed".
        ok = (await prisma.user.count({ where: { ...where, emailVerifiedAt: { not: null } } })) > 0;
    }
    if (ok) {
        await startSession(claims!.userId);
        await endPending();
    }
    return NextResponse.redirect(new URL(`/verify-email?status=${ok ? 'ok' : 'invalid'}`, req.url), 303);
}
