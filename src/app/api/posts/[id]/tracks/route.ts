import { NextResponse } from 'next/server';
import { z } from 'zod';
import { jsonError, readJson, validationError } from '@/lib/http';
import { MAX_POST_TRACKS } from '@/lib/limits';
import { ownPost } from '@/lib/own-post';
import { prisma } from '@/lib/prisma';
import { memoSchema, videoSchema } from '@/lib/validation';

// Small edits to one of the user's playlists from inside a room, without opening the editor.

const touch = (id: string) => prisma.post.update({ where: { id }, data: { updatedAt: new Date() } });

const newTrackSchema = videoSchema.extend({ memo: memoSchema.nullish() });
const newTracksSchema = z.object({
    tracks: z.array(newTrackSchema).min(1, 'songsRequired').max(MAX_POST_TRACKS, 'songsMax'),
});

/**
 * Appends songs (e.g. ones just heard in a room, with the room memos the admin wrote) to the end of the playlist.
 * Songs already in the playlist are skipped; if the rest don't fit, nothing is added.
 */
export async function POST(req: Request, ctx: RouteContext<'/api/posts/[id]/tracks'>) {
    const { id } = await ctx.params;
    const { error } = await ownPost(id);
    if (error) return error;
    const parsed = newTracksSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);

    const existing = await prisma.postTrack.findMany({ where: { postId: id }, select: { videoId: true, position: true } });
    const seen = new Set(existing.map((t) => t.videoId));
    const fresh = parsed.data.tracks.filter((t) => {
        if (seen.has(t.videoId)) return false;
        seen.add(t.videoId);
        return true;
    });
    if (existing.length + fresh.length > MAX_POST_TRACKS) return jsonError('songsMax');
    const start = Math.max(-1, ...existing.map((t) => t.position)) + 1;
    const [tracks] = await prisma.$transaction([
        prisma.postTrack.createManyAndReturn({
            data: fresh.map((t, i) => ({ ...t, memo: t.memo || null, postId: id, position: start + i })),
            select: { id: true, videoId: true, title: true, channel: true, thumbnail: true, durationSec: true, memo: true },
        }),
        touch(id),
    ]);
    return NextResponse.json({ tracks, skipped: parsed.data.tracks.length - fresh.length }, { status: 201 });
}

const reorderSchema = z.object({ orderedIds: z.array(z.string()).max(MAX_POST_TRACKS) });

/** Saves a new song order. `orderedIds` must list every song of the playlist exactly once. */
export async function PUT(req: Request, ctx: RouteContext<'/api/posts/[id]/tracks'>) {
    const { id } = await ctx.params;
    const { error } = await ownPost(id);
    if (error) return error;
    const parsed = reorderSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);
    const ids = parsed.data.orderedIds;

    const tracks = await prisma.postTrack.findMany({ where: { postId: id }, select: { id: true } });
    const known = new Set(tracks.map((t) => t.id));
    if (ids.length !== known.size || new Set(ids).size !== ids.length || !ids.every((t) => known.has(t))) {
        return jsonError('playlistChanged', 409);
    }
    await prisma.$transaction([
        ...ids.map((trackId, position) =>
            prisma.postTrack.updateMany({ where: { id: trackId, postId: id }, data: { position } }),
        ),
        touch(id),
    ]);
    return NextResponse.json({ ok: true });
}
