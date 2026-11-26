import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { readJson } from '@/lib/http';
import { liveRoomsOwnedBy } from '@/lib/rooms';

const schema = z.object({
    /** The browser's secret client id (src/lib/client-identity.ts), which made its rooms. */
    clientId: z.string().regex(/^[A-Za-z0-9-]{8,64}$/),
});

/**
 * The rooms this browser (and the signed-in account) made that are still open, for the home
 * page's card. A POST so the client id stays out of URLs and logs. Only called by browsers that
 * have made a room (src/components/home/MyRoomsCard.tsx); members' own rooms already come with
 * the page.
 */
export async function POST(req: Request) {
    const parsed = schema.safeParse(await readJson(req));
    if (!parsed.success) return NextResponse.json({ rooms: [] }, { status: 400 });
    const me = await getCurrentUser();
    const rooms = await liveRoomsOwnedBy({ userId: me?.id, clientId: parsed.data.clientId });
    return NextResponse.json({ rooms }, { headers: { 'Cache-Control': 'no-store' } });
}
