import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { jsonError, readJson, validationError } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { postSchema } from '@/lib/validation';

export async function POST(req: Request) {
    const me = await getCurrentUser();
    if (!me) return jsonError('Please log in to share a playlist', 401);
    const parsed = postSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);
    const { title, description, body, tracks } = parsed.data;

    const post = await prisma.post.create({
        data: {
            authorId: me.id,
            title,
            description: description || null,
            body: body || null,
            tracks: { create: tracks.map((t, position) => ({ ...t, position })) },
        },
        select: { id: true },
    });
    return NextResponse.json({ id: post.id }, { status: 201 });
}
