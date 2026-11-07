import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { jsonError, readJson, validationError } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { newShareToken } from '@/lib/post-access';
import { findOrCreateScenario } from '@/lib/scenarios';
import { postSchema } from '@/lib/validation';

export async function POST(req: Request) {
    const me = await getCurrentUser();
    if (!me) return jsonError('loginToShare', 401);
    const parsed = postSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);
    const { title, scenario, writer, visibility, anonymous, tracks } = parsed.data;

    const scenarioId = scenario ? (await findOrCreateScenario(scenario, writer)).id : null;
    const post = await prisma.post.create({
        data: {
            authorId: me.id,
            title,
            visibility,
            anonymous,
            shareToken: newShareToken(),
            scenarioId,
            tracks: {
                create: tracks.map((t, position) => ({ ...t, memo: t.memo || null, position })),
            },
        },
        select: { id: true },
    });
    return NextResponse.json({ id: post.id }, { status: 201 });
}
