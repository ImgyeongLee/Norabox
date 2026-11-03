import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { endSession, getCurrentUser } from '@/lib/auth';
import { jsonError, readJson, validationError } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { deleteOrphanScenarios } from '@/lib/scenarios';
import { avatarKey, deleteImage } from '@/lib/storage';
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
 * Delete the signed-in user's account right away (password required). The row goes, and with it
 * their posts, tracks and likes (database cascades); rooms they own stay until they expire.
 */
export async function DELETE(req: Request) {
    const me = await getCurrentUser();
    if (!me) return jsonError('loginRequired', 401);
    const parsed = z.object({ password: z.string().min(1, 'passwordRequired') }).safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);

    const user = await prisma.user.findUniqueOrThrow({
        where: { id: me.id },
        select: { passwordHash: true, avatarMime: true },
    });
    if (!(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
        return jsonError('currentPasswordWrong', 400, { password: 'currentPasswordWrong' });
    }
    // The image first: once the row is gone, nothing points at it any more.
    if (user.avatarMime) {
        try {
            await deleteImage(avatarKey(me.id));
        } catch (e) {
            console.error('[account] delete from S3 failed', e);
            return jsonError('generic', 502);
        }
    }
    await prisma.user.deleteMany({ where: { id: me.id } });
    await endSession();
    // Left-over scenarios don't block the deletion; the next cleanup removes them.
    await deleteOrphanScenarios().catch((e) => console.error('[account] scenario cleanup failed', e));
    return NextResponse.json({ ok: true });
}
