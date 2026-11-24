import { prisma } from '@/lib/prisma';
import { avatarKey, getImage } from '@/lib/storage';
import { USER_ACTIVE } from '@/lib/users';

/** A short CDN cache, so a missing image isn't looked up again for every viewer. */
const notFound = () =>
    new Response('Not found', { status: 404, headers: { 'CDN-Cache-Control': 'public, max-age=300' } });

/** Streams a user's profile image from the private S3 bucket. */
export async function GET(_req: Request, ctx: RouteContext<'/api/users/[id]/avatar'>) {
    const { id } = await ctx.params;
    const user = await prisma.user.findUnique({ where: { id, status: USER_ACTIVE }, select: { avatarMime: true } });
    if (!user?.avatarMime) return notFound();

    const image = await getImage(avatarKey(id)).catch((e) => {
        console.error('[avatar] read from S3 failed', e);
        return null;
    });
    if (!image) return notFound();
    return new Response(image.body, {
        headers: {
            'Content-Type': image.contentType ?? user.avatarMime,
            ...(image.contentLength ? { 'Content-Length': String(image.contentLength) } : {}),
            // URLs carry a version param, so browsers and CDNs can cache them for a long time.
            'Cache-Control': 'public, max-age=31536000, immutable',
            // Vercel's CDN doesn't cache on `max-age` alone; this lets it answer without running
            // this function (and reading S3) for every new viewer.
            'CDN-Cache-Control': 'public, max-age=31536000, immutable',
            'X-Content-Type-Options': 'nosniff',
        },
    });
}
