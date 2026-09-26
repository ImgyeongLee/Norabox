import { NextResponse } from 'next/server';
import { jsonError } from '@/lib/http';
import { prisma } from '@/lib/prisma';

/** Room lookup: used to validate invite codes and to import a room's playlist into a post. */
export async function GET(_req: Request, ctx: RouteContext<'/api/rooms/[code]'>) {
    const { code } = await ctx.params;
    const room = await prisma.room.findUnique({
        where: { slug: code.toLowerCase() },
        select: {
            code: true,
            items: {
                orderBy: { position: 'asc' },
                select: { videoId: true, title: true, channel: true, thumbnail: true, durationSec: true },
            },
        },
    });
    if (!room) return jsonError('Room not found', 404);
    return NextResponse.json(room);
}
