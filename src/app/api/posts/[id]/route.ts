import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { jsonError, readJson, validationError } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { deleteOrphanScenarios, findOrCreateScenario } from '@/lib/scenarios';
import { postSchema } from '@/lib/validation';

async function ownPost(id: string) {
    const me = await getCurrentUser();
    if (!me) return { error: jsonError('loginRequired', 401) };
    const post = await prisma.post.findUnique({ where: { id }, select: { authorId: true } });
    if (!post) return { error: jsonError('postNotFound', 404) };
    if (post.authorId !== me.id) return { error: jsonError('notYourPost', 403) };
    return { error: null };
}

export async function PATCH(req: Request, ctx: RouteContext<'/api/posts/[id]'>) {
    const { id } = await ctx.params;
    const { error } = await ownPost(id);
    if (error) return error;
    const parsed = postSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);
    const { title, scenario, writer, tracks } = parsed.data;

    const scenarioId = scenario ? (await findOrCreateScenario(scenario, writer)).id : null;
    await prisma.$transaction([
        prisma.postTrack.deleteMany({ where: { postId: id } }),
        prisma.post.update({
            where: { id },
            data: {
                title,
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
