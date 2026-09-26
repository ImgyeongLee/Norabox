'use client';

import { useEffect, useState } from 'react';
import { NextIcon, PauseIcon, PlayIcon, PrevIcon, RepeatIcon } from '@/components/icons';
import { formatDuration } from '@/lib/format';
import type { AckResult, LoopMode, Playback, PlaylistEntry } from '@/lib/room-types';

type Props = {
    current: PlaylistEntry | null;
    playback: Playback;
    loopMode: LoopMode;
    canControl: boolean;
    hasItems: boolean;
    positionOf: (p: Playback) => number;
    act: (
        event: 'player:play' | 'player:pause' | 'player:next' | 'player:prev' | 'player:seek' | 'room:loop',
        payload?: unknown,
    ) => Promise<AckResult>;
};

const LOOP_NEXT: Record<LoopMode, LoopMode> = { none: 'all', all: 'one', one: 'none' };
const LOOP_LABEL: Record<LoopMode, string> = { none: 'Loop off', all: 'Loop playlist', one: 'Loop this song' };

export function PlayerControls({ current, playback, loopMode, canControl, hasItems, positionOf, act }: Props) {
    const [now, setNow] = useState(0);
    const [scrub, setScrub] = useState<number | null>(null);

    useEffect(() => {
        const tick = () => setNow(positionOf(playback));
        tick();
        if (!playback.isPlaying) return;
        const t = setInterval(tick, 250);
        return () => clearInterval(t);
    }, [playback, positionOf]);

    const duration = current?.durationSec ?? null;
    const shown = Math.min(scrub ?? now, duration ?? Infinity);
    const pct = duration ? (shown / duration) * 100 : 0;
    const disabledHint = canControl ? undefined : 'Only the admin or a DJ can control playback';

    function commitSeek() {
        if (scrub != null) act('player:seek', { position: scrub });
        setScrub(null);
    }

    return (
        <div className="space-y-3">
            <div>
                <h2 className="line-clamp-2 text-lg font-semibold leading-snug">
                    {current?.title ?? 'No song selected'}
                </h2>
                <p className="truncate text-sm text-lime/55">
                    {current ? `${current.channel} · added by ${current.addedBy}` : 'The playlist is empty'}
                </p>
            </div>

            <div>
                <input
                    type="range"
                    className="slider w-full"
                    min={0}
                    max={duration ?? 1}
                    step={1}
                    value={duration ? shown : 0}
                    style={{ '--fill': `${pct}%` } as React.CSSProperties}
                    disabled={!canControl || !duration}
                    onChange={(e) => setScrub(Number(e.target.value))}
                    onPointerUp={commitSeek}
                    onKeyUp={commitSeek}
                    onBlur={() => setScrub(null)}
                    aria-label="Seek"
                    title={disabledHint}
                />
                <div className="mt-1 flex justify-between font-mono text-xs text-lime/55">
                    <span>{formatDuration(current ? shown : null)}</span>
                    <span>{formatDuration(duration)}</span>
                </div>
            </div>

            <div className="flex items-center justify-center gap-2 sm:gap-4">
                <button
                    className={`icon-btn relative ${loopMode !== 'none' ? 'text-moss' : 'text-lime/50'}`}
                    onClick={() => act('room:loop', { mode: LOOP_NEXT[loopMode] })}
                    disabled={!canControl}
                    aria-label={`${LOOP_LABEL[loopMode]} (click to change)`}
                    title={canControl ? LOOP_LABEL[loopMode] : disabledHint}>
                    <RepeatIcon />
                    {loopMode === 'one' && (
                        <span className="absolute right-1 top-1 rounded-full bg-moss px-1 text-[9px] font-bold leading-tight text-pine">
                            1
                        </span>
                    )}
                </button>
                <button
                    className="icon-btn"
                    onClick={() => act('player:prev')}
                    disabled={!canControl || !hasItems}
                    aria-label="Previous"
                    title={disabledHint}>
                    <PrevIcon />
                </button>
                <button
                    className="inline-flex size-14 items-center justify-center rounded-full bg-moss text-pine shadow-lg transition hover:bg-lime disabled:opacity-40"
                    onClick={() => act(playback.isPlaying ? 'player:pause' : 'player:play')}
                    disabled={!canControl || !hasItems}
                    aria-label={playback.isPlaying ? 'Pause' : 'Play'}
                    title={disabledHint}>
                    {playback.isPlaying ? <PauseIcon className="size-6" /> : <PlayIcon className="size-6" />}
                </button>
                <button
                    className="icon-btn"
                    onClick={() => act('player:next')}
                    disabled={!canControl || !hasItems}
                    aria-label="Next"
                    title={disabledHint}>
                    <NextIcon />
                </button>
                <span className="w-10 text-center text-[10px] font-medium uppercase leading-tight text-lime/50">
                    {loopMode === 'none' ? '' : loopMode === 'one' ? 'song' : 'list'}
                </span>
            </div>
            {!canControl && <p className="text-center text-xs text-lime/45">{disabledHint}.</p>}
        </div>
    );
}
