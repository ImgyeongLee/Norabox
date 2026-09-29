import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { jsonError } from '@/lib/http';
import { likedPlaylists } from '@/lib/playlists';

/** The signed-in user's liked playlists, with songs, for the room's Imports tab. */
export async function GET() {
    const me = await getCurrentUser();
    if (!me) return jsonError('loginRequired', 401);
    return NextResponse.json({ playlists: await likedPlaylists(me.id) }, { headers: { 'Cache-Control': 'no-store' } });
}
