import { NextResponse } from 'next/server';
import { startSession } from '@/lib/auth';
import { jsonError, readJson, validationError } from '@/lib/http';
import { checkLogin } from '@/lib/login';
import { loginSchema } from '@/lib/validation';

export async function POST(req: Request) {
    const parsed = loginSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);
    const { email, password } = parsed.data;

    const result = await checkLogin(email, password);
    if (!result.ok) return jsonError(result.error, result.error === 'accountLocked' ? 423 : 401);
    await startSession(result.userId);
    return NextResponse.json({ ok: true });
}
