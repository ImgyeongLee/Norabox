import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { jsonError } from '@/lib/http';
import { likedPlaylists, ownPlaylists } from '@/lib/playlists';

/**
 * The signed-in user's own and liked playlists, with songs, for the room's Library tab.
 * `?scope=mine` skips the liked ones (for "Add to my playlist").
 */
export async function GET(req: Request) {
    const me = await getCurrentUser();
    if (!me) return jsonError('loginRequired', 401);
    const onlyMine = new URL(req.url).searchParams.get('scope') === 'mine';
    const [mine, liked] = await Promise.all([ownPlaylists(me.id), onlyMine ? [] : likedPlaylists(me.id)]);
    return NextResponse.json({ mine, liked }, { headers: { 'Cache-Control': 'no-store' } });
}
