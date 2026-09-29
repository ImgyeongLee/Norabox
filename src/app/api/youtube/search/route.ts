import { NextResponse, type NextRequest } from 'next/server';
import { jsonError } from '@/lib/http';
import { searchVideos, YouTubeError } from '@/lib/youtube';

export async function GET(req: NextRequest) {
    const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
    if (!q) return NextResponse.json({ results: [] });
    if (q.length > 200) return jsonError('searchTooLong');
    try {
        return NextResponse.json({ results: await searchVideos(q) });
    } catch (e) {
        if (e instanceof YouTubeError) return jsonError(e.code, 502);
        console.error('[youtube] search failed', e);
        return jsonError('youtubeFailed', 502);
    }
}
