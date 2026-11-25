'use client';

import { useEffect, useState } from 'react';
import { formatDuration } from '@/lib/format';
import type { Playback } from '@/lib/room-types';

/**
 * The cyberpunk skin's heads-up display over the video: feed label, sync state, track number and
 * playback position in the corners, and faint scanlines. Decorative (the same facts are shown
 * by the player and the status label), so screen readers skip it, and it never takes clicks.
 */
export function VideoHud({
    playback,
    positionOf,
    trackNo,
    trackCount,
    synced,
}: {
    playback: Playback;
    positionOf: (p: Playback) => number;
    /** 1-based place of the current song in the playlist; null when nothing is selected. */
    trackNo: number | null;
    trackCount: number;
    /** Connected to the room, so playback is in sync. */
    synced: boolean;
}) {
    const [position, setPosition] = useState(() => positionOf(playback));

    // Ticks once a second while playing; otherwise shows where playback stopped.
    useEffect(() => {
        const update = () => setPosition(positionOf(playback));
        update();
        if (!playback.isPlaying) return;
        const timer = setInterval(update, 1000);
        return () => clearInterval(timer);
    }, [playback, positionOf]);

    const pad = (n: number) => String(n).padStart(2, '0');
    return (
        <div aria-hidden className="cyber-hud pointer-events-none absolute inset-0 z-10">
            <span className="cyber-hud-tl">FEED_01 // YOUTUBE</span>
            <span className={`cyber-hud-tr ${synced ? '' : 'cyber-hud-lost'}`}>● {synced ? 'SYNC LOCK' : 'SYNC LOST'}</span>
            <span className="cyber-hud-bl">
                TRK {trackNo ? pad(trackNo) : '--'} / {pad(trackCount)}
            </span>
            <span className="cyber-hud-br">{formatDuration(position)}</span>
        </div>
    );
}
