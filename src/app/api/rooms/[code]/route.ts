import { NextResponse } from 'next/server';
import { jsonError } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { purgeIfExpired } from '@/lib/rooms';

/**
 * Room lookup: used to validate invite codes and to import a room's playlist into a post.
 * Hidden songs are the admin's surprises, and a closed room's playlist is only for the people in it.
 */
export async function GET(_req: Request, ctx: RouteContext<'/api/rooms/[code]'>) {
    const { code } = await ctx.params;
    await purgeIfExpired(code.toLowerCase());
    const room = await prisma.room.findUnique({
        where: { slug: code.toLowerCase() },
        select: {
            code: true,
            locked: true,
            items: {
                where: { hidden: false },
                orderBy: { position: 'asc' },
                select: { videoId: true, title: true, channel: true, thumbnail: true, durationSec: true },
            },
        },
    });
    if (!room) return jsonError('roomNotFound', 404);
    return NextResponse.json(room.locked ? { ...room, items: [] } : room);
}
