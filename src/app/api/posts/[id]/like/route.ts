import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { jsonError } from '@/lib/http';
import { canViewPost } from '@/lib/post-access';
import { prisma } from '@/lib/prisma';

async function respond(postId: string, liked: boolean) {
    const count = await prisma.postLike.count({ where: { postId } });
    return NextResponse.json({ liked, count });
}

/**
 * Like a post (signed-in users only). Liking twice is a no-op.
 * Unlisted posts need their share token (`?s=`), i.e. the user reached them through the share link.
 */
export async function POST(req: Request, ctx: RouteContext<'/api/posts/[id]/like'>) {
    const { id } = await ctx.params;
    const me = await getCurrentUser();
    if (!me) return jsonError('loginToLike', 401);
    const post = await prisma.post.findUnique({
        where: { id },
        select: { authorId: true, visibility: true, shareToken: true },
    });
    const token = new URL(req.url).searchParams.get('s');
    if (!post || !canViewPost(post, me.id, token)) return jsonError('postNotFound', 404);
    await prisma.postLike.upsert({
        where: { userId_postId: { userId: me.id, postId: id } },
        create: { userId: me.id, postId: id },
        update: {},
    });
    return respond(id, true);
}

export async function DELETE(_req: Request, ctx: RouteContext<'/api/posts/[id]/like'>) {
    const { id } = await ctx.params;
    const me = await getCurrentUser();
    if (!me) return jsonError('loginToLike', 401);
    await prisma.postLike.deleteMany({ where: { userId: me.id, postId: id } });
    return respond(id, false);
}
