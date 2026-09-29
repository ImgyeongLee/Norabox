import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { RoomClient } from '@/components/room/RoomClient';
import { getCurrentUser } from '@/lib/auth';
import { getI18n } from '@/i18n/server';
import { prisma } from '@/lib/prisma';
import { purgeIfExpired } from '@/lib/rooms';

export async function generateMetadata(props: PageProps<'/room/[code]'>): Promise<Metadata> {
    const [{ code }, { t }] = await Promise.all([props.params, getI18n()]);
    return { title: t.meta.room(code) };
}

export default async function RoomPage(props: PageProps<'/room/[code]'>) {
    const { code } = await props.params;
    if (!/^[A-Za-z0-9]{1,32}$/.test(code)) notFound();
    await purgeIfExpired(code.toLowerCase());
    const room = await prisma.room.findUnique({ where: { slug: code.toLowerCase() }, select: { code: true } });
    if (!room) notFound();
    if (room.code !== code) redirect(`/room/${room.code}`);

    const user = await getCurrentUser();
    return <RoomClient code={room.code} user={user && { username: user.username, avatarUrl: user.avatarUrl }} />;
}
