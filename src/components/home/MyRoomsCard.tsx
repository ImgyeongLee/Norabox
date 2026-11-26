'use client';

import Link from '@/components/AppLink';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { LuArrowRight, LuX } from 'react-icons/lu';
import { Icon } from '@/components/icons';
import { dateLocale } from '@/i18n/config';
import { useI18n } from '@/i18n/client';
import { getClientId } from '@/lib/client-identity';
import { THEME_PALETTES } from '@/lib/room-themes';
import type { OwnRoom } from '@/lib/rooms';

/** Set when this browser makes a room; only then does the card ask the server about its rooms. */
export const MADE_ROOM_KEY = 'norabox:madeRoom';
/** The card was closed in this tab (it shows again in a new one). */
const CLOSED_KEY = 'norabox:myRoomsClosed';

const read = (storage: 'local' | 'session', key: string) => {
    try {
        return (storage === 'local' ? localStorage : sessionStorage).getItem(key);
    } catch {
        return null;
    }
};
const write = (storage: 'local' | 'session', key: string, value: string | null) => {
    try {
        const s = storage === 'local' ? localStorage : sessionStorage;
        if (value === null) s.removeItem(key);
        else s.setItem(key, value);
    } catch {}
};

/** Remembers that this browser made a room (called after creating one). */
export const rememberMadeRoom = () => write('local', MADE_ROOM_KEY, '1');

const noopSubscribe = () => () => {};

/**
 * Floating card on the home page listing the rooms this visitor made that are still open, each
 * with a button to go back in. Members' rooms come with the page (`initial`, found on the server,
 * so no extra request); a browser that has made a room asks the server once for its own (rooms made
 * as a guest, or before logging in). Nothing shows when there are none. Closing it leaves a small
 * pill in its place for the rest of the visit (this tab).
 */
export function MyRoomsCard({ initial }: { initial: OwnRoom[] }) {
    const { t, locale } = useI18n();
    const [fetched, setFetched] = useState<OwnRoom[] | null>(null);
    // Browser-only facts, read after hydration (the server renders no card).
    const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
    const [closed, setClosed] = useState(() => read('session', CLOSED_KEY) === '1');
    // "Now" for the activity times, taken once (the card is short-lived; times are approximate).
    const [now] = useState(Date.now);

    useEffect(() => {
        if (read('local', MADE_ROOM_KEY) !== '1') return;
        let cancelled = false;
        fetch('/api/rooms/mine', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId: getClientId() }),
        })
            .then((res) => (res.ok ? res.json() : null))
            .then((data: { rooms: OwnRoom[] } | null) => {
                if (cancelled || !data) return;
                setFetched(data.rooms);
                // None left: stop asking until this browser makes another room.
                if (data.rooms.length === 0) write('local', MADE_ROOM_KEY, null);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, []);

    // The page's rooms plus this browser's, once each, most recently active first.
    const rooms = [...initial, ...(fetched ?? [])]
        .filter((r, i, all) => all.findIndex((o) => o.code === r.code) === i)
        .sort((a, b) => b.lastActiveAt.localeCompare(a.lastActiveAt));

    if (!hydrated || rooms.length === 0) return null;

    const ago = (iso: string) => {
        const minutes = Math.round((now - new Date(iso).getTime()) / 60_000);
        if (minutes < 1) return t.myRooms.activeNow;
        const rtf = new Intl.RelativeTimeFormat(dateLocale(locale), { numeric: 'auto' });
        return t.myRooms.activeAgo(minutes < 60 ? rtf.format(-minutes, 'minute') : rtf.format(-Math.floor(minutes / 60), 'hour'));
    };
    const setOpen = (open: boolean) => {
        setClosed(!open);
        write('session', CLOSED_KEY, open ? null : '1');
    };

    return (
        <div className="fixed inset-x-3 bottom-4 z-30 flex flex-col items-end sm:inset-x-auto sm:bottom-6 sm:right-6">
            {closed ? (
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-moss/60 bg-pine/95 py-2 pl-3 pr-4 text-sm font-bold text-lime shadow-xl transition hover:border-moss focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime/70">
                    <span aria-hidden className="size-2 rounded-full bg-moss shadow-[0_0_8px_var(--color-moss)]" />
                    {t.myRooms.count(rooms.length)}
                </button>
            ) : (
                <section
                    aria-labelledby="my-rooms-title"
                    className="w-full rounded-2xl border border-moss/45 bg-pine/95 p-3 pt-2.5 shadow-2xl backdrop-blur sm:w-95">
                    <div className="flex items-start justify-between gap-2 pl-1">
                        <div className="pt-1">
                            <h2 id="my-rooms-title" className="text-[15px] font-extrabold">
                                {t.myRooms.title}
                            </h2>
                            <p className="mt-0.5 hidden text-xs text-lime/70 sm:block">{t.myRooms.hint}</p>
                        </div>
                        <button type="button" onClick={() => setOpen(false)} aria-label={t.myRooms.close} className="icon-btn size-9 shrink-0">
                            <Icon as={LuX} className="size-4" />
                        </button>
                    </div>
                    <ul className="mt-2 space-y-1.5">
                        {rooms.map((r) => {
                            const p = THEME_PALETTES[r.theme];
                            return (
                                <li key={r.code} className="flex items-center gap-2.5 rounded-xl border border-leaf/50 bg-fern/50 py-2 pl-2.5 pr-2">
                                    <span
                                        aria-hidden
                                        className="size-6.5 shrink-0 rounded-full ring-1 ring-white/15"
                                        style={{ background: `conic-gradient(${p.pine} 0 25%, ${p.fern} 0 50%, ${p.leaf} 0 75%, ${p.moss} 0)` }}
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate font-mono text-sm font-bold">{r.code}</span>
                                        <span className="block truncate text-xs text-lime/70">
                                            {t.roomForms.themes[r.theme]} · {ago(r.lastActiveAt)}
                                        </span>
                                    </span>
                                    <Link
                                        href={`/room/${r.code}`}
                                        aria-label={t.myRooms.enterLabel(r.code)}
                                        className="btn-primary shrink-0 gap-1.5 px-3.5 py-2 text-[13px]">
                                        {t.myRooms.enter}
                                        <Icon as={LuArrowRight} className="size-3.5" />
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}
        </div>
    );
}
