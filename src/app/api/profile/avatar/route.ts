import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { AVATAR_MAX_BYTES, AVATAR_TYPES } from '@/lib/avatar';
import { jsonError } from '@/lib/http';
import { prisma } from '@/lib/prisma';

/** Upload a profile image as multipart form data (field "avatar"). */
export async function POST(req: Request) {
    const me = await getCurrentUser();
    if (!me) return jsonError('Please log in', 401);
    const form = await req.formData().catch(() => null);
    const file = form?.get('avatar');
    if (!(file instanceof File)) return jsonError('Choose an image to upload');
    if (!AVATAR_TYPES.includes(file.type)) return jsonError('Use a JPEG, PNG or WebP image');
    if (file.size > AVATAR_MAX_BYTES) return jsonError('Image is too large (max 512 KB)');

    const bytes = new Uint8Array(await file.arrayBuffer());
    await prisma.user.update({ where: { id: me.id }, data: { avatar: bytes, avatarMime: file.type } });
    return NextResponse.json({ ok: true });
}

export async function DELETE() {
    const me = await getCurrentUser();
    if (!me) return jsonError('Please log in', 401);
    await prisma.user.update({ where: { id: me.id }, data: { avatar: null, avatarMime: null } });
    return NextResponse.json({ ok: true });
}
