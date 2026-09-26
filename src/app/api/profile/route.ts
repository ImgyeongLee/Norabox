import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { jsonError, readJson, validationError } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { usernameSchema } from '@/lib/validation';

/** Change username. */
export async function PATCH(req: Request) {
    const me = await getCurrentUser();
    if (!me) return jsonError('Please log in', 401);
    const parsed = z.object({ username: usernameSchema }).safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);
    const { username } = parsed.data;
    if (username === me.username) return NextResponse.json({ ok: true });

    const taken = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (taken) return jsonError('That username is taken', 409, { username: 'Username is taken' });
    await prisma.user.update({ where: { id: me.id }, data: { username } });
    return NextResponse.json({ ok: true });
}
