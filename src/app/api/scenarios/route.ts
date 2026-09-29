import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { scenarioKey } from '@/lib/validation';

/** Existing scenarios whose title matches the query, for the post editor's suggestions. */
export async function GET(req: NextRequest) {
    const q = scenarioKey(req.nextUrl.searchParams.get('q') ?? '').slice(0, 120);
    if (!q) return NextResponse.json({ scenarios: [] });
    const rows = await prisma.scenario.findMany({
        where: { nameKey: { contains: q } },
        orderBy: [{ posts: { _count: 'desc' } }, { name: 'asc' }],
        take: 8,
        select: { id: true, name: true, writer: true, _count: { select: { posts: true } } },
    });
    return NextResponse.json({
        scenarios: rows.map((r) => ({ id: r.id, name: r.name, writer: r.writer, posts: r._count.posts })),
    });
}
