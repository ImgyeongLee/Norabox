import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { jsonError } from '@/lib/http';
import { newShareToken } from '@/lib/post-access';
import { prisma } from '@/lib/prisma';

/** Author only: replace the share link, so links shared earlier stop working. */
export async function POST(_req: Request, ctx: RouteContext<'/api/posts/[id]/share-link'>) {
    const { id } = await ctx.params;
    const me = await getCurrentUser();
    if (!me) return jsonError('loginRequired', 401);
    const post = await prisma.post.findUnique({ where: { id }, select: { authorId: true } });
    if (!post || post.authorId !== me.id) return jsonError('postNotFound', 404);
    const { shareToken } = await prisma.post.update({
        where: { id },
        data: { shareToken: newShareToken() },
        select: { shareToken: true },
    });
    return NextResponse.json({ shareToken });
}
