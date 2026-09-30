import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { jsonError } from '@/lib/http';
import { likedPlaylists, ownPlaylists } from '@/lib/playlists';

/** The signed-in user's own and liked playlists, with songs, for the room's Library tab. */
export async function GET() {
    const me = await getCurrentUser();
    if (!me) return jsonError('loginRequired', 401);
    const [mine, liked] = await Promise.all([ownPlaylists(me.id), likedPlaylists(me.id)]);
    return NextResponse.json({ mine, liked }, { headers: { 'Cache-Control': 'no-store' } });
}
