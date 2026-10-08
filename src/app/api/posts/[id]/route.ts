import { NextResponse } from 'next/server';
import { readJson, validationError } from '@/lib/http';
import { ownPost } from '@/lib/own-post';
import { prisma } from '@/lib/prisma';
import { deleteOrphanScenarios, findOrCreateScenario } from '@/lib/scenarios';
import { postSchema } from '@/lib/validation';

export async function PATCH(req: Request, ctx: RouteContext<'/api/posts/[id]'>) {
    const { id } = await ctx.params;
    const { error } = await ownPost(id);
    if (error) return error;
    const parsed = postSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);
    const { title, scenario, writer, visibility, tracks } = parsed.data;

    const scenarioId = scenario ? (await findOrCreateScenario(scenario, writer)).id : null;
    await prisma.$transaction([
        prisma.postTrack.deleteMany({ where: { postId: id } }),
        prisma.post.update({
            where: { id },
            data: {
                title,
                visibility,
                scenarioId,
                tracks: {
                    create: tracks.map((t, position) => ({ ...t, description: t.description || null, position })),
                },
            },
        }),
    ]);
    await deleteOrphanScenarios();
    return NextResponse.json({ id });
}

export async function DELETE(_req: Request, ctx: RouteContext<'/api/posts/[id]'>) {
    const { id } = await ctx.params;
    const { error } = await ownPost(id);
    if (error) return error;
    await prisma.post.delete({ where: { id } });
    await deleteOrphanScenarios();
    return NextResponse.json({ ok: true });
}
