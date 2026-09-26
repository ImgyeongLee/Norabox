import { prisma } from '@/lib/prisma';

export async function GET(_req: Request, ctx: RouteContext<'/api/users/[id]/avatar'>) {
    const { id } = await ctx.params;
    const user = await prisma.user.findUnique({ where: { id }, select: { avatar: true, avatarMime: true } });
    if (!user?.avatar || !user.avatarMime) return new Response('Not found', { status: 404 });
    return new Response(Buffer.from(user.avatar), {
        headers: {
            'Content-Type': user.avatarMime,
            // URLs carry a version param, so they can be cached for a long time.
            'Cache-Control': 'public, max-age=31536000, immutable',
            'X-Content-Type-Options': 'nosniff',
        },
    });
}
