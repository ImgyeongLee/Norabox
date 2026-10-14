'use client';

import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/i18n/client';
import type { Playback } from '@/lib/room-types';
import { loadYouTubeApi, YTState, type YTPlayer } from '@/lib/youtube-iframe';

type Props = {
    videoId: string | null;
    itemId: string | null;
    playback: Playback;
    /** Where the room's track is right now, in seconds (uses the server clock). */
    expectedPosition: () => number;
    /** Effective volume 0–100 (master × personal). */
    volume: number;
    onEnded: (itemId: string) => void;
    onDuration: (itemId: string, seconds: number) => void;
};

/** Drift (seconds) we tolerate before seeking the local player. */
const DRIFT_TOLERANCE = 0.8;
/** After a corrective seek, give the player time to buffer before checking again. */
const SEEK_COOLDOWN_MS = 2500;

/**
 * A YouTube player that follows the room's authoritative playback state.
 * Listeners never control it directly: controls are hidden, and a sync loop
 * nudges it (play / pause / seek) to match the server.
 */
export function SyncedPlayer(props: Props) {
    const { t } = useI18n();
    const host = useRef<HTMLDivElement>(null);
    const player = useRef<YTPlayer | null>(null);
    const [ready, setReady] = useState(false);
    const [blocked, setBlocked] = useState(false);
    const [errorFor, setErrorFor] = useState<string | null>(null);
    const latest = useRef(props);
    const loadedItem = useRef<string | null>(null);
    const lastSeek = useRef(0);
    const stuckTicks = useRef(0);
    const reportedDuration = useRef<string | null>(null);

    useEffect(() => {
        latest.current = props;
    });

    // Create the player once.
    useEffect(() => {
        let cancelled = false;
        const mount = document.createElement('div');
        host.current?.appendChild(mount);
        loadYouTubeApi().then((YT) => {
            if (cancelled) return;
            player.current = new YT.Player(mount, {
                width: '100%',
                height: '100%',
                playerVars: {
                    autoplay: 0,
                    controls: 0,
                    disablekb: 1,
                    fs: 0,
                    iv_load_policy: 3,
                    modestbranding: 1,
                    playsinline: 1,
                    rel: 0,
                },
                events: {
                    onReady: () => setReady(true),
                    onStateChange: (e) => {
                        const p = latest.current;
                        if (e.data === YTState.ENDED && loadedItem.current && p.playback.isPlaying) {
                            p.onEnded(loadedItem.current);
                        }
                        if (e.data === YTState.PLAYING) {
                            stuckTicks.current = 0;
                            setErrorFor(null);
                            setBlocked(false);
                            const d = e.target.getDuration();
                            const id = loadedItem.current;
                            if (id && d > 0 && reportedDuration.current !== id) {
                                reportedDuration.current = id;
                                p.onDuration(id, d);
                            }
                        }
                    },
                    // 2: bad id, 5: HTML5 error, 100: removed, 101/150: embedding disabled.
                    onError: () => setErrorFor(loadedItem.current),
                },
            });
        });
        return () => {
            cancelled = true;
            player.current?.destroy();
            player.current = null;
            mount.remove();
        };
    }, []);

    // Load the current track when it changes.
    useEffect(() => {
        const p = player.current;
        if (!ready || !p) return;
        if (!props.videoId || !props.itemId) {
            loadedItem.current = null;
            p.stopVideo();
            return;
        }
        if (loadedItem.current === props.itemId) return;
        loadedItem.current = props.itemId;
        lastSeek.current = Date.now();
        const start = latest.current.expectedPosition();
        if (latest.current.playback.isPlaying) p.loadVideoById({ videoId: props.videoId, startSeconds: start });
        else p.cueVideoById({ videoId: props.videoId, startSeconds: start });
    }, [ready, props.videoId, props.itemId]);

    // Volume.
    useEffect(() => {
        const p = player.current;
        if (!ready || !p) return;
        p.setVolume(props.volume);
        if (props.volume === 0) p.mute();
        else p.unMute();
    }, [ready, props.volume]);

    // Sync loop: runs on every playback change and once a second.
    useEffect(() => {
        if (!ready) return;
        const sync = (force: boolean) => {
            const p = player.current;
            const { playback, expectedPosition } = latest.current;
            if (!p || !loadedItem.current || loadedItem.current !== playback.itemId) return;
            const state = p.getPlayerState();
            const expected = expectedPosition();
            const drift = p.getCurrentTime() - expected;
            const canSeek = force || Date.now() - lastSeek.current > SEEK_COOLDOWN_MS;

            if (playback.isPlaying) {
                const duration = p.getDuration();
                if (state === YTState.ENDED && (!duration || expected >= duration - 1)) return;
                if (Math.abs(drift) > DRIFT_TOLERANCE && canSeek && state !== YTState.BUFFERING) {
                    p.seekTo(expected, true);
                    lastSeek.current = Date.now();
                }
                if (state !== YTState.PLAYING && state !== YTState.BUFFERING) {
                    p.playVideo();
                    // If play keeps failing, the browser is blocking autoplay: ask for a tap.
                    if (++stuckTicks.current >= 3) setBlocked(true);
                }
            } else {
                stuckTicks.current = 0;
                if (state === YTState.PLAYING || state === YTState.BUFFERING) p.pauseVideo();
                if (Math.abs(drift) > 0.4 && canSeek) {
                    p.seekTo(playback.position, true);
                    lastSeek.current = Date.now();
                }
            }
        };
        sync(true);
        const t = setInterval(() => sync(false), 1000);
        return () => clearInterval(t);
    }, [ready, props.playback.seq, props.itemId]);

    function resume() {
        const p = player.current;
        if (!p) return;
        p.seekTo(latest.current.expectedPosition(), true);
        p.playVideo();
        setBlocked(false);
        stuckTicks.current = 0;
    }

    return (
        // At least 200x200px (YouTube's minimum player size): on narrow phones 16:9 would be shorter.
        <div className="relative aspect-video min-h-[200px] w-full overflow-hidden rounded-xl bg-black">
            {/* The iframe is display-only; the room controls playback. */}
            <div ref={host} className="pointer-events-none absolute inset-0 [&>iframe]:size-full" />
            {!props.videoId && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-pine/90 p-6 text-center">
                    <p className="text-lg font-semibold">{t.player.nothingPlaying}</p>
                    <p className="text-sm muted">{t.player.nothingPlayingHint}</p>
                </div>
            )}
            {errorFor && errorFor === props.itemId && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-pine/90 p-6 text-center">
                    <p className="font-semibold">{t.player.cantPlay}</p>
                    <p className="text-sm muted">{t.player.cantPlayHint}</p>
                </div>
            )}
            {blocked && props.videoId && !errorFor && (
                <button
                    onClick={resume}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-pine/80 text-center">
                    <span className="btn-primary">{t.player.tapToListen}</span>
                    <span className="text-xs muted">{t.player.autoplayPaused}</span>
                </button>
            )}
        </div>
    );
}
