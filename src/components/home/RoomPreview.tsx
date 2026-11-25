'use client';

import { GripIcon, NextIcon, PauseIcon, PrevIcon } from '@/components/icons';
import { RoleBadge } from '@/components/room/MembersPanel';
import { ThemeBackdrop } from '@/components/room/ThemeBackdrop';
import { useI18n } from '@/i18n/client';
import { hasAnimatedBackdrop, hasSkin, paletteVars, THEME_PALETTES, type RoomTheme } from '@/lib/room-themes';
import { SKIN_FONTS } from '@/lib/skin-fonts';

/**
 * A small, still picture of a room in `theme`, for picking a theme before the room exists.
 * It is built from the same classes and hooks as the real room (card, btn-*, data-room-*, …) and
 * sets the theme's colors as CSS variables on itself only, so the theme's palette and skin
 * (globals.css) restyle it exactly as they would the room, and the rest of the page keeps its own
 * look. Decorative: screen readers get the theme's name from the picker instead.
 */
export function RoomPreview({ theme, code }: { theme: RoomTheme; code: string }) {
    const { t } = useI18n();
    const p = THEME_PALETTES[theme];
    const songs = t.roomForms.previewSongs;
    return (
        <div
            aria-hidden
            data-room-preview
            data-room-skin={hasSkin(theme) ? theme : undefined}
            className={`relative isolate overflow-hidden rounded-2xl border border-white/15 shadow-2xl ${SKIN_FONTS[theme] ?? ''}`}
            style={{ ...paletteVars(p), background: p.pageBackground, color: 'var(--color-lime)' } as React.CSSProperties}>
            {hasAnimatedBackdrop(theme) && <ThemeBackdrop theme={theme} contained />}
            <div className="relative z-10 p-4 sm:p-5">
                <div data-room-header className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-3">
                    <div data-room-title className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 text-xs muted">
                                <span data-status-dot className="size-2 rounded-full bg-moss" />
                                {t.room.status.connected}
                            </span>
                            <RoleBadge role="admin" />
                        </div>
                        <p data-text={code} className="room-code mt-1 break-all font-mono text-2xl font-bold">
                            {code}
                        </p>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
                    {/* Player */}
                    <div className="card space-y-3 p-3">
                        <div className="aspect-video rounded-xl bg-black/40" />
                        <div>
                            <p data-song-title className="line-clamp-1 text-base font-semibold leading-snug">
                                {songs[0]}
                            </p>
                            <p className="truncate text-xs text-lime/55">{t.roomForms.previewChannel}</p>
                        </div>
                        <input
                            type="range"
                            className="slider w-full"
                            value={38}
                            readOnly
                            tabIndex={-1}
                            style={{ '--fill': '38%' } as React.CSSProperties}
                        />
                        <div className="flex items-center justify-center gap-3">
                            <span className="icon-btn">
                                <PrevIcon className="size-4" />
                            </span>
                            <span
                                data-play-button
                                className="inline-flex size-12 items-center justify-center rounded-full bg-moss text-pine shadow-lg">
                                <PauseIcon className="size-5" />
                            </span>
                            <span className="icon-btn">
                                <NextIcon className="size-4" />
                            </span>
                        </div>
                    </div>

                    {/* Playlist (left out on phones, to keep the preview short) */}
                    <div className="card hidden flex-col gap-2 p-3 sm:flex">
                        <div role="tablist" className="grid grid-cols-3 gap-1 rounded-xl bg-pine/60 p-1 text-xs font-semibold">
                            <span role="tab" aria-selected="true" className="truncate rounded-lg bg-moss px-1 py-1.5 text-center text-pine">
                                {t.room.tabs.playlist(songs.length)}
                            </span>
                            <span role="tab" aria-selected="false" className="truncate px-1 py-1.5 text-center text-lime/70">
                                {t.room.tabs.search}
                            </span>
                            <span role="tab" aria-selected="false" className="truncate px-1 py-1.5 text-center text-lime/70">
                                {t.room.tabs.people(3)}
                            </span>
                        </div>
                        {songs.map((title, i) => (
                            <div
                                key={title}
                                data-state={i === 0 ? 'current' : i === 2 ? 'hidden' : undefined}
                                className={`flex items-center gap-2 rounded-xl border p-1.5 ${
                                    i === 0
                                        ? 'border-moss/70 bg-leaf/40'
                                        : i === 2
                                          ? 'border-dashed border-lime/25 bg-pine/20'
                                          : 'border-transparent bg-pine/40'
                                }`}>
                                <GripIcon className="size-3.5 shrink-0 text-lime/40" />
                                <span className="h-6 w-10 shrink-0 rounded-md bg-black/30" />
                                <span data-song-title className="min-w-0 truncate text-xs font-medium">
                                    {title}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
