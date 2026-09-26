import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { jsonError, readJson, validationError } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { postSchema } from '@/lib/validation';

async function ownPost(id: string) {
    const me = await getCurrentUser();
    if (!me) return { error: jsonError('Please log in', 401) };
    const post = await prisma.post.findUnique({ where: { id }, select: { authorId: true } });
    if (!post) return { error: jsonError('Post not found', 404) };
    if (post.authorId !== me.id) return { error: jsonError('You can only change your own posts', 403) };
    return { error: null };
}

export async function PATCH(req: Request, ctx: RouteContext<'/api/posts/[id]'>) {
    const { id } = await ctx.params;
    const { error } = await ownPost(id);
    if (error) return error;
    const parsed = postSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);
    const { title, description, body, tracks } = parsed.data;

    await prisma.$transaction([
        prisma.postTrack.deleteMany({ where: { postId: id } }),
        prisma.post.update({
            where: { id },
            data: {
                title,
                description: description || null,
                body: body || null,
                tracks: { create: tracks.map((t, position) => ({ ...t, position })) },
            },
        }),
    ]);
    return NextResponse.json({ id });
}

export async function DELETE(_req: Request, ctx: RouteContext<'/api/posts/[id]'>) {
    const { id } = await ctx.params;
    const { error } = await ownPost(id);
    if (error) return error;
    await prisma.post.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
