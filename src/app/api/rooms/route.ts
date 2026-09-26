import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { jsonError, readJson, validationError } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { roomCodeSchema } from '@/lib/validation';

const createRoomSchema = z.object({
    name: roomCodeSchema,
    clientId: z.string().regex(/^[A-Za-z0-9-]{8,64}$/, 'Invalid client id'),
});

export async function POST(req: Request) {
    const parsed = createRoomSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);
    const { name, clientId } = parsed.data;
    const slug = name.toLowerCase();

    const existing = await prisma.room.findUnique({ where: { slug }, select: { id: true } });
    if (existing) {
        return jsonError('A room with this name already exists — pick another name or join it instead', 409, {
            name: 'Room name is taken',
        });
    }
    const me = await getCurrentUser();
    const room = await prisma.room.create({
        data: { code: name, slug, ownerClientId: clientId, ownerUserId: me?.id ?? null },
        select: { code: true },
    });
    return NextResponse.json({ code: room.code }, { status: 201 });
}
