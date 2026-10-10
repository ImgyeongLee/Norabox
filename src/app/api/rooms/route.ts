import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { jsonError, readJson, validationError } from '@/lib/http';
import { MAX_MEMO } from '@/lib/limits';
import { prisma } from '@/lib/prisma';
import { canViewPost } from '@/lib/post-access';
import { ROOM_THEMES } from '@/lib/room-themes';
import { purgeIfExpired } from '@/lib/rooms';
import { USER_DELETED } from '@/lib/users';
import { roomCodeSchema } from '@/lib/validation';

const createRoomSchema = z.object({
    name: roomCodeSchema,
    clientId: z.string().regex(/^[A-Za-z0-9-]{8,64}$/, 'invalidClient'),
    /** Optional forum post whose songs become the new room's playlist (the post's Import button). */
    importPostId: z.string().regex(/^[a-z0-9]{10,40}$/, 'postNotFound').optional(),
    /** Color theme everyone in the room sees. */
    theme: z.enum(ROOM_THEMES, 'invalidInput').optional().default('default'),
    /** Share token, when importing someone else's unlisted playlist through its share link. */
    importShareToken: z.string().max(100).optional(),
});

export async function POST(req: Request) {
    const parsed = createRoomSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);
    const { name, clientId, theme, importPostId, importShareToken } = parsed.data;
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
                      select: { videoId: true, title: true, channel: true, thumbnail: true, durationSec: true, memo: true },
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
            theme,
            // The first song becomes the current one when the room loads (paused until someone presses play).
            items: imported
                ? {
                      create: imported.tracks.map(({ memo, ...t }, position) => ({
                          ...t,
                          // Older playlist memos can be longer than a room memo allows.
                          memo: memo?.slice(0, MAX_MEMO) || null,
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
