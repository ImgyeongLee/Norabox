import { NextResponse, type NextRequest } from 'next/server';
import { jsonError } from '@/lib/http';
import { MAX_PLAYLIST_IMPORT } from '@/lib/limits';
import { parseVideoId, playlistFromIds } from '@/lib/youtube';

/**
 * A YouTube playlist's title and songs, for adding it to a room. The browser reads the playlist's
 * video ids from YouTube's player and sends them (`?list=<id>&ids=a,b,c`); this looks them up
 * through oEmbed, so it uses no API quota.
 */
export async function GET(req: NextRequest) {
    const list = req.nextUrl.searchParams.get('list') ?? '';
    const ids = [...new Set((req.nextUrl.searchParams.get('ids') ?? '').split(',').filter(Boolean))];
    if (
        !/^[A-Za-z0-9_-]{2,64}$/.test(list) ||
        ids.length === 0 ||
        ids.length > MAX_PLAYLIST_IMPORT ||
        !ids.every((id) => parseVideoId(id) === id)
    ) {
        return jsonError('invalidInput');
    }
    try {
        return NextResponse.json({ playlist: await playlistFromIds(list, ids) });
    } catch (e) {
        console.error('[youtube] playlist lookup failed', e);
        return jsonError('playlistLookupFailed', 502);
    }
}
