import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { endSession, getCurrentUser } from '@/lib/auth';
import { jsonError, readJson, validationError } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { USER_DELETED } from '@/lib/users';
import { usernameSchema } from '@/lib/validation';

/** Change username. */
export async function PATCH(req: Request) {
    const me = await getCurrentUser();
    if (!me) return jsonError('loginRequired', 401);
    const parsed = z.object({ username: usernameSchema }).safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);
    const { username } = parsed.data;
    if (username === me.username) return NextResponse.json({ ok: true });

    const taken = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (taken) return jsonError('usernameTaken', 409, { username: 'usernameTaken' });
    await prisma.user.update({ where: { id: me.id }, data: { username } });
    return NextResponse.json({ ok: true });
}

/**
 * Delete the signed-in user's account (password required). Only the status changes:
 * the row and their forum posts stay, shown with the author as "Deleted user".
 */
export async function DELETE(req: Request) {
    const me = await getCurrentUser();
    if (!me) return jsonError('loginRequired', 401);
    const parsed = z.object({ password: z.string().min(1, 'passwordRequired') }).safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: me.id }, select: { passwordHash: true } });
    if (!(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
        return jsonError('currentPasswordWrong', 400, { password: 'currentPasswordWrong' });
    }
    await prisma.user.update({ where: { id: me.id }, data: { status: USER_DELETED } });
    await endSession();
    return NextResponse.json({ ok: true });
}
