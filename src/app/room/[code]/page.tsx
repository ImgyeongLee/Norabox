import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';
import { RoomClient } from '@/components/room/RoomClient';
import { ThemeBackdrop } from '@/components/room/ThemeBackdrop';
import { getCurrentUser } from '@/lib/auth';
import { getI18n } from '@/i18n/server';
import { prisma } from '@/lib/prisma';
import {
    hasAnimatedBackdrop,
    isRoomTheme,
    MOTION_COOKIE,
    THEME_PALETTES,
    themeCss,
    type RoomTheme,
} from '@/lib/room-themes';
import { purgeIfExpired } from '@/lib/rooms';
import { isPlainTheme, PLAIN_PALETTE, PLAIN_THEME_COOKIE } from '@/lib/site-theme';

const getRoom = cache(async (code: string) => {
    if (!/^[A-Za-z0-9]{1,32}$/.test(code)) return null;
    await purgeIfExpired(code.toLowerCase());
    return prisma.room.findUnique({ where: { slug: code.toLowerCase() }, select: { code: true, theme: true } });
});

const themeOf = (room: { theme: string } | null): RoomTheme => (room && isRoomTheme(room.theme) ? room.theme : 'default');

export async function generateMetadata(props: PageProps<'/room/[code]'>): Promise<Metadata> {
    const [{ code }, { t }] = await Promise.all([props.params, getI18n()]);
    return { title: t.meta.room(code) };
}

/** Tints the mobile browser bar to match the room's theme. */
export async function generateViewport(props: PageProps<'/room/[code]'>): Promise<Viewport> {
    const [room, cookieStore] = await Promise.all([getRoom((await props.params).code), cookies()]);
    const theme = themeOf(room);
    // Default-theme rooms take the visitor's white & black look (src/lib/site-theme.ts) when it's on.
    const plain = theme === 'default' && isPlainTheme(cookieStore.get(PLAIN_THEME_COOKIE)?.value);
    return { themeColor: plain ? PLAIN_PALETTE.pine : THEME_PALETTES[theme].pine };
}

export default async function RoomPage(props: PageProps<'/room/[code]'>) {
    const { code } = await props.params;
    const room = await getRoom(code);
    if (!room) notFound();
    if (room.code !== code) redirect(`/room/${room.code}`);

    const [user, cookieStore] = await Promise.all([getCurrentUser(), cookies()]);
    const theme = themeOf(room);
    // Themes with a moving background; each visitor can turn it off (MotionToggle).
    const motion = hasAnimatedBackdrop(theme) ? (cookieStore.get(MOTION_COOKIE)?.value === 'off' ? 'off' : 'on') : null;
    return (
        <>
            {/* The room's theme recolors the whole page for everyone in it; it goes away when they leave. */}
            {theme !== 'default' && <style>{themeCss(theme)}</style>}
            {motion === 'on' && <ThemeBackdrop theme={theme} />}
            <RoomClient
                code={room.code}
                user={user && { username: user.username, avatarUrl: user.avatarUrl }}
                // Without a YouTube API key, rooms add songs by link only (no search).
                searchAvailable={!!process.env.YOUTUBE_API_KEY?.trim()}
                motion={motion}
            />
        </>
    );
}
