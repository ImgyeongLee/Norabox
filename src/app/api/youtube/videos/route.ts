import { NextResponse, type NextRequest } from 'next/server';
import { jsonError } from '@/lib/http';
import { MAX_POST_TRACKS } from '@/lib/limits';
import { getVideos, parseVideoId, YouTubeError } from '@/lib/youtube';

/**
 * Looks up several videos at once (`?ids=a,b,c`, up to a playlist's worth) for the playlist editor's
 * "Paste a list". Videos that can't be found or embedded are left out of `videos`.
 */
export async function GET(req: NextRequest) {
    const ids = [...new Set((req.nextUrl.searchParams.get('ids') ?? '').split(',').filter(Boolean))];
    if (ids.length === 0 || ids.length > MAX_POST_TRACKS || !ids.every((id) => parseVideoId(id) === id)) {
        return jsonError('invalidInput');
    }
    try {
        return NextResponse.json({ videos: await getVideos(ids) });
    } catch (e) {
        if (e instanceof YouTubeError) return jsonError(e.code, 502);
        console.error('[youtube] video lookup failed', e);
        return jsonError('videoLookupFailed', 502);
    }
}
