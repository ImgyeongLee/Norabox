import { NextResponse, type NextRequest } from 'next/server';
import { jsonError } from '@/lib/http';
import { getVideo, parseVideoId, YouTubeError } from '@/lib/youtube';

/** Looks up one video from a YouTube link: title, owner (channel), thumbnail, duration. */
export async function GET(req: NextRequest) {
    const id = parseVideoId(req.nextUrl.searchParams.get('url') ?? '');
    if (!id) return jsonError('notAYouTubeLink');
    try {
        const video = await getVideo(id);
        if (!video) return jsonError('videoUnavailable', 404);
        return NextResponse.json({ video });
    } catch (e) {
        if (e instanceof YouTubeError) return jsonError(e.code, 502);
        console.error('[youtube] video lookup failed', e);
        return jsonError('videoLookupFailed', 502);
    }
}
