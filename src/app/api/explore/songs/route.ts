import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSiteAdmin } from '@/lib/announcements';
import { EXPLORE_ACTIONS, EXPLORE_TAG } from '@/lib/explore';
import { jsonError, readJson, validationError } from '@/lib/http';
import { prisma } from '@/lib/prisma';

const schema = z.object({
    videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/, 'invalidVideo'),
    // "none" undoes either.
    action: z.enum([...EXPLORE_ACTIONS, 'none'], 'invalidInput'),
});

/** Site admin: blur a song's thumbnail on Explore, swap the song out for another, or undo that. */
export async function PUT(req: Request) {
    const { error } = await requireSiteAdmin();
    if (error) return error;
    const parsed = schema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);
    const { videoId, action } = parsed.data;

    if (action === 'none') {
        await prisma.exploreSong.deleteMany({ where: { videoId } });
    } else {
        const track = await prisma.postTrack.findFirst({ where: { videoId }, select: { title: true } });
        if (!track) return jsonError('songNotFound', 404);
        await prisma.exploreSong.upsert({
            where: { videoId },
            create: { videoId, action, title: track.title },
            update: { action },
        });
    }
    // Today's picks are cached for the day; make the next visit pick again.
    revalidateTag(EXPLORE_TAG, { expire: 0 });
    return NextResponse.json({ ok: true });
}
