import bcrypt from 'bcryptjs';
import { MAX_LOGIN_ATTEMPTS } from '@/lib/limits';
import { prisma } from '@/lib/prisma';
import { USER_ACTIVE } from '@/lib/users';

export type LoginResult = { ok: true; userId: string } | { ok: false; error: 'badCredentials' | 'accountLocked' };

const lock = (id: string) =>
    prisma.user.updateMany({ where: { id, lockedAt: null }, data: { lockedAt: new Date() } });

/**
 * Checks an email and password. After MAX_LOGIN_ATTEMPTS wrong passwords in a row the account
 * is locked until the site admin unlocks it (see README); a correct password resets the count.
 * The attempt is counted before the password is checked, so even parallel requests get at most
 * MAX_LOGIN_ATTEMPTS guesses.
 */
export async function checkLogin(email: string, password: string): Promise<LoginResult> {
    const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, passwordHash: true, status: true, lockedAt: true },
    });
    // Deleted accounts get the same answer as a wrong password.
    if (!user || user.status !== USER_ACTIVE) return { ok: false, error: 'badCredentials' };
    if (user.lockedAt) return { ok: false, error: 'accountLocked' };

    const [attempt] = await prisma.user.updateManyAndReturn({
        where: { id: user.id, lockedAt: null, failedLogins: { lt: MAX_LOGIN_ATTEMPTS } },
        data: { failedLogins: { increment: 1 } },
        select: { failedLogins: true },
    });
    if (!attempt) {
        // Out of attempts (e.g. the last ones arrived at the same time): make sure it's locked.
        await lock(user.id);
        return { ok: false, error: 'accountLocked' };
    }

    if (await bcrypt.compare(password, user.passwordHash)) {
        await prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0 } });
        return { ok: true, userId: user.id };
    }
    if (attempt.failedLogins >= MAX_LOGIN_ATTEMPTS) {
        await lock(user.id);
        return { ok: false, error: 'accountLocked' };
    }
    return { ok: false, error: 'badCredentials' };
}
