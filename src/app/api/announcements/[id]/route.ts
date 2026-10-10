import { NextResponse } from 'next/server';
import { jsonError, readJson, validationError } from '@/lib/http';
import { requireSiteAdmin } from '@/lib/announcements';
import { prisma } from '@/lib/prisma';
import { announcementSchema } from '@/lib/validation';

export async function PATCH(req: Request, ctx: RouteContext<'/api/announcements/[id]'>) {
    const { id } = await ctx.params;
    const { error } = await requireSiteAdmin();
    if (error) return error;
    const parsed = announcementSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);
    const { count } = await prisma.announcement.updateMany({
        where: { id },
        data: { ...parsed.data, updatedAt: new Date() },
    });
    if (count === 0) return jsonError('announcementNotFound', 404);
    return NextResponse.json({ id });
}

export async function DELETE(_req: Request, ctx: RouteContext<'/api/announcements/[id]'>) {
    const { id } = await ctx.params;
    const { error } = await requireSiteAdmin();
    if (error) return error;
    await prisma.announcement.deleteMany({ where: { id } });
    return NextResponse.json({ ok: true });
}
