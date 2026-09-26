import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { jsonError, readJson, validationError } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { changePasswordSchema } from '@/lib/validation';

export async function POST(req: Request) {
    const me = await getCurrentUser();
    if (!me) return jsonError('Please log in', 401);
    const parsed = changePasswordSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: me.id }, select: { passwordHash: true } });
    if (!(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash))) {
        return jsonError('Current password is incorrect', 400, { currentPassword: 'Current password is incorrect' });
    }
    await prisma.user.update({
        where: { id: me.id },
        data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 12) },
    });
    return NextResponse.json({ ok: true });
}
