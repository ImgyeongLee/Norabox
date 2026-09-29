'use client';

import { useEffect, useState } from 'react';
import { NextIcon, PauseIcon, PlayIcon, PrevIcon, RepeatIcon } from '@/components/icons';
import { useI18n } from '@/i18n/client';
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

export function PlayerControls({ current, playback, loopMode, canControl, hasItems, positionOf, act }: Props) {
    const { t } = useI18n();
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
    const disabledHint = canControl ? undefined : t.player.controlDenied;
    const loopLabel = t.player.loop[loopMode];

    function commitSeek() {
        if (scrub != null) act('player:seek', { position: scrub });
        setScrub(null);
    }

    return (
        <div className="space-y-3">
            <div>
                <h2 className="line-clamp-2 text-lg font-semibold leading-snug">
                    {current?.title ?? t.player.noSong}
                </h2>
                <p className="truncate text-sm text-lime/55">
                    {current
                        ? current.addedBy
                            ? t.player.addedBy(current.channel, current.addedBy)
                            : current.channel
                        : t.player.emptyPlaylist}
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
                    aria-label={t.player.seek}
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
                    aria-label={t.player.loopChange(loopLabel)}
                    title={canControl ? loopLabel : disabledHint}>
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
                    aria-label={t.player.prev}
                    title={disabledHint}>
                    <PrevIcon />
                </button>
                <button
                    className="inline-flex size-14 items-center justify-center rounded-full bg-moss text-pine shadow-lg transition hover:bg-lime disabled:opacity-40"
                    onClick={() => act(playback.isPlaying ? 'player:pause' : 'player:play')}
                    disabled={!canControl || !hasItems}
                    aria-label={playback.isPlaying ? t.player.pause : t.player.play}
                    title={disabledHint}>
                    {playback.isPlaying ? <PauseIcon className="size-6" /> : <PlayIcon className="size-6" />}
                </button>
                <button
                    className="icon-btn"
                    onClick={() => act('player:next')}
                    disabled={!canControl || !hasItems}
                    aria-label={t.player.next}
                    title={disabledHint}>
                    <NextIcon />
                </button>
                <span className="w-10 text-center text-[10px] font-medium uppercase leading-tight text-lime/50">
                    {loopMode === 'none' ? '' : t.player.loopTag[loopMode]}
                </span>
            </div>
            {!canControl && <p className="text-center text-xs text-lime/45">{disabledHint}</p>}
        </div>
    );
}
