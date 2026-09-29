import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { AVATAR_MAX_BYTES, AVATAR_TYPES } from '@/lib/avatar';
import { jsonError } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { avatarKey, deleteImage, putImage } from '@/lib/storage';

/** Upload a profile image as multipart form data (field "avatar"). Stored in S3. */
export async function POST(req: Request) {
    const me = await getCurrentUser();
    if (!me) return jsonError('loginRequired', 401);
    const form = await req.formData().catch(() => null);
    const file = form?.get('avatar');
    if (!(file instanceof File)) return jsonError('avatarMissing');
    if (!AVATAR_TYPES.includes(file.type)) return jsonError('avatarType');
    if (file.size > AVATAR_MAX_BYTES) return jsonError('avatarTooLarge');

    try {
        await putImage(avatarKey(me.id), new Uint8Array(await file.arrayBuffer()), file.type);
    } catch (e) {
        console.error('[avatar] upload to S3 failed', e);
        return jsonError('uploadFailed', 502);
    }
    // Also bumps updatedAt, which changes the avatar URL's ?v= so browsers refetch it.
    await prisma.user.update({ where: { id: me.id }, data: { avatarMime: file.type } });
    return NextResponse.json({ ok: true });
}

export async function DELETE() {
    const me = await getCurrentUser();
    if (!me) return jsonError('loginRequired', 401);
    try {
        await deleteImage(avatarKey(me.id));
    } catch (e) {
        console.error('[avatar] delete from S3 failed', e);
        return jsonError('generic', 502);
    }
    await prisma.user.update({ where: { id: me.id }, data: { avatarMime: null } });
    return NextResponse.json({ ok: true });
}
