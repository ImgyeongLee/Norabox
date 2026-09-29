import { prisma } from '@/lib/prisma';
import { avatarKey, getImage } from '@/lib/storage';
import { USER_ACTIVE } from '@/lib/users';

/** Streams a user's profile image from the private S3 bucket. */
export async function GET(_req: Request, ctx: RouteContext<'/api/users/[id]/avatar'>) {
    const { id } = await ctx.params;
    const user = await prisma.user.findUnique({ where: { id, status: USER_ACTIVE }, select: { avatarMime: true } });
    if (!user?.avatarMime) return new Response('Not found', { status: 404 });

    const image = await getImage(avatarKey(id)).catch((e) => {
        console.error('[avatar] read from S3 failed', e);
        return null;
    });
    if (!image) return new Response('Not found', { status: 404 });
    return new Response(image.body, {
        headers: {
            'Content-Type': image.contentType ?? user.avatarMime,
            ...(image.contentLength ? { 'Content-Length': String(image.contentLength) } : {}),
            // URLs carry a version param, so browsers and CDNs can cache them for a long time.
            'Cache-Control': 'public, max-age=31536000, immutable',
            'X-Content-Type-Options': 'nosniff',
        },
    });
}
