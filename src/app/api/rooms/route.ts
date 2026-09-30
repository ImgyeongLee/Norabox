import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { jsonError, readJson, validationError } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { canViewPost } from '@/lib/post-access';
import { purgeIfExpired } from '@/lib/rooms';
import { USER_DELETED } from '@/lib/users';
import { roomCodeSchema } from '@/lib/validation';

const createRoomSchema = z.object({
    name: roomCodeSchema,
    clientId: z.string().regex(/^[A-Za-z0-9-]{8,64}$/, 'invalidClient'),
    /** Optional forum post whose songs become the new room's playlist (the post's Import button). */
    importPostId: z.string().regex(/^[a-z0-9]{10,40}$/, 'postNotFound').optional(),
    /** Share token, when importing someone else's unlisted playlist through its share link. */
    importShareToken: z.string().max(100).optional(),
});

export async function POST(req: Request) {
    const parsed = createRoomSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);
    const { name, clientId, importPostId, importShareToken } = parsed.data;
    const me = await getCurrentUser();
    const slug = name.toLowerCase();

    const imported = importPostId
        ? await prisma.post.findUnique({
              where: { id: importPostId },
              select: {
                  authorId: true,
                  visibility: true,
                  shareToken: true,
                  author: { select: { username: true, status: true } },
                  tracks: {
                      orderBy: { position: 'asc' },
                      select: { videoId: true, title: true, channel: true, thumbnail: true, durationSec: true },
                  },
              },
          })
        : null;
    if (importPostId && (!imported || !canViewPost(imported, me?.id, importShareToken))) {
        return jsonError('postNotFound', 404);
    }

    // An expired room's name is free again.
    await purgeIfExpired(slug);
    const existing = await prisma.room.findUnique({ where: { slug }, select: { id: true } });
    if (existing) {
        return jsonError('roomNameTaken', 409, { name: 'roomNameTaken' });
    }
    const room = await prisma.room.create({
        data: {
            code: name,
            slug,
            ownerClientId: clientId,
            ownerUserId: me?.id ?? null,
            // The first song becomes the current one when the room loads (paused until someone presses play).
            items: imported
                ? {
                      create: imported.tracks.map((t, position) => ({
                          ...t,
                          position,
                          // No credit for deleted accounts; the UI then shows just the channel.
                          addedBy: imported.author.status === USER_DELETED ? '' : imported.author.username,
                      })),
                  }
                : undefined,
        },
        select: { code: true },
    });
    return NextResponse.json({ code: room.code }, { status: 201 });
}
