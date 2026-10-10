import { NextResponse } from 'next/server';
import { readJson, validationError } from '@/lib/http';
import { requireSiteAdmin } from '@/lib/announcements';
import { prisma } from '@/lib/prisma';
import { announcementSchema } from '@/lib/validation';

/** Publishes an announcement (site admins only). */
export async function POST(req: Request) {
    const { error } = await requireSiteAdmin();
    if (error) return error;
    const parsed = announcementSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);
    const { id } = await prisma.announcement.create({ data: parsed.data, select: { id: true } });
    return NextResponse.json({ id }, { status: 201 });
}
