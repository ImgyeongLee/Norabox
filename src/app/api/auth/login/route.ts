import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { startSession } from '@/lib/auth';
import { jsonError, readJson, validationError } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { loginSchema } from '@/lib/validation';

export async function POST(req: Request) {
    const parsed = loginSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, passwordHash: true } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return jsonError('Incorrect email or password', 401);
    }
    await startSession(user.id);
    return NextResponse.json({ ok: true });
}
