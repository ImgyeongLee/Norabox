'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getClientId } from '@/lib/client-identity';
import type { AckResult, ClientToServerEvents, Playback, RoomSnapshot, ServerToClientEvents } from '@/lib/room-types';

type RoomSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'error';

/** Emits an event and resolves with the server's ack (or a timeout error). */
function emitAck(socket: RoomSocket, event: keyof ClientToServerEvents, payload?: unknown): Promise<AckResult> {
    return new Promise((resolve) => {
        const args: unknown[] = payload === undefined ? [] : [payload];
        (socket.timeout(8000).emit as (...a: unknown[]) => void)(event, ...args, (err: Error | null, res: AckResult) =>
            resolve(err ? { ok: false, error: 'serverTimeout' } : res),
        );
    });
}

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;

/**
 * How long one token from /api/realtime/token is reused for reconnects. Tokens last 10 minutes
 * (src/lib/session.ts) and an expired one makes the realtime server treat the user as a guest, so
 * this stays two minutes under that. Reusing it keeps reconnects (a phone waking up, the realtime host
 * restarting) from calling a serverless function each time.
 */
const TOKEN_REUSE_MS = 8 * 60 * 1000;

/** Identifies signed-in users to the realtime server (null for guests). */
async function fetchSocketToken(): Promise<string | null> {
    try {
        const res = await fetch('/api/realtime/token', { cache: 'no-store' });
        return res.ok ? ((await res.json()).token ?? null) : null;
    } catch {
        return null;
    }
}

/** Measures serverClock − localClock using the lowest-latency of several pings. */
async function measureClockOffset(socket: RoomSocket): Promise<number | null> {
    let best: { rtt: number; offset: number } | null = null;
    for (let i = 0; i < 5; i++) {
        const t0 = Date.now();
        const serverNow = await new Promise<number | null>((resolve) =>
            socket.timeout(3000).emit('time:ping', (err: Error | null, now: number) => resolve(err ? null : now)),
        );
        const t1 = Date.now();
        if (serverNow == null) continue;
        const rtt = t1 - t0;
        const offset = serverNow + rtt / 2 - t1;
        if (!best || rtt < best.rtt) best = { rtt, offset };
    }
    return best?.offset ?? null;
}

/**
 * Connects to a room once `name` is set (i.e. the visitor pressed "Join").
 * Returns the live room snapshot plus helpers to act on it.
 */
export function useRoom(code: string, name: string | null, signedIn: boolean) {
    const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
    const [memberId, setMemberId] = useState<string | null>(null);
    const [status, setStatus] = useState<ConnectionStatus>('connecting');
    const [fatal, setFatal] = useState<string | null>(null);
    const socketRef = useRef<RoomSocket | null>(null);
    const offset = useRef(0);

    useEffect(() => {
        if (name === null) return;
        // Kept per connection (not per page), so logging into another account never reuses a token.
        let cached: { token: string; at: number } | null = null;
        const options = {
            transports: ['websocket', 'polling'],
            // Called on every (re)connect. Guests have no token to fetch.
            auth: (cb: (data: { token: string | null }) => void) => {
                if (!signedIn) return cb({ token: null });
                if (cached && Date.now() - cached.at < TOKEN_REUSE_MS) return cb({ token: cached.token });
                fetchSocketToken().then((token) => {
                    cached = token ? { token, at: Date.now() } : null;
                    cb({ token });
                });
            },
        };
        // In production the realtime server is a separate service; locally it shares the app's origin.
        const socket: RoomSocket = SOCKET_URL ? io(SOCKET_URL, options) : io(options);
        socketRef.current = socket;
        let resync: ReturnType<typeof setInterval> | undefined;

        socket.on('connect', async () => {
            const o = await measureClockOffset(socket);
            if (o != null) offset.current = o;
            socket.emit('room:join', { code, clientId: getClientId(), name }, (res) => {
                if (!res.ok) {
                    setFatal(res.error);
                    setStatus('error');
                    socket.disconnect();
                    return;
                }
                setMemberId(res.memberId);
                setSnapshot(res.snapshot);
                setStatus('connected');
            });
            clearInterval(resync);
            resync = setInterval(async () => {
                const o2 = await measureClockOffset(socket);
                if (o2 != null) offset.current = o2;
            }, 30_000);
        });
        socket.on('disconnect', () => setStatus((s) => (s === 'error' ? s : 'reconnecting')));
        socket.io.on('reconnect_attempt', () => setStatus((s) => (s === 'error' ? s : 'reconnecting')));
        socket.on('room:state', setSnapshot);

        return () => {
            clearInterval(resync);
            socket.removeAllListeners();
            socket.disconnect();
            socketRef.current = null;
        };
    }, [code, name, signedIn]);

    const serverNow = useCallback(() => Date.now() + offset.current, []);

    const positionOf = useCallback(
        (p: Playback) => (p.isPlaying ? p.position + (serverNow() - p.updatedAt) / 1000 : p.position),
        [serverNow],
    );

    const act = useCallback(async (event: keyof ClientToServerEvents, payload?: unknown): Promise<AckResult> => {
        const socket = socketRef.current;
        if (!socket?.connected) return { ok: false, error: 'notConnected' };
        return emitAck(socket, event, payload);
    }, []);

    /** Fire-and-forget reports from the local player. */
    const report = useCallback((event: 'player:ended' | 'player:duration', payload: unknown) => {
        (socketRef.current?.emit as ((...a: unknown[]) => void) | undefined)?.(event, payload);
    }, []);

    return { snapshot, memberId, status, fatal, positionOf, act, report };
}
