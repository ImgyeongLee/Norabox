import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { scenarioKey } from '@/lib/validation';

/**
 * Existing scenarios whose title matches the query, for the post editor's suggestions.
 * Only scenarios used by public posts (or the user's own) are suggested, so private
 * playlists don't leak through here.
 */
export async function GET(req: NextRequest) {
    const q = scenarioKey(req.nextUrl.searchParams.get('q') ?? '').slice(0, 120);
    if (!q) return NextResponse.json({ scenarios: [] });
    const me = await getCurrentUser();
    const visible = { OR: [{ visibility: 'public' }, ...(me ? [{ authorId: me.id }] : [])] };
    const rows = await prisma.scenario.findMany({
        where: { nameKey: { contains: q }, posts: { some: visible } },
        take: 30,
        select: { id: true, name: true, writer: true, _count: { select: { posts: { where: { visibility: 'public' } } } } },
    });
    const scenarios = rows
        .map((r) => ({ id: r.id, name: r.name, writer: r.writer, posts: r._count.posts }))
        .sort((a, b) => b.posts - a.posts || a.name.localeCompare(b.name))
        .slice(0, 8);
    return NextResponse.json({ scenarios });
}
