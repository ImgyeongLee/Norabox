'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { LuEye, LuEyeOff, LuLock } from 'react-icons/lu';
import { Avatar } from '@/components/Avatar';
import { CopyButton } from '@/components/CopyButton';
import { Icon } from '@/components/icons';
import { VideoSearch } from '@/components/VideoSearch';
import { LibraryPanel } from '@/components/room/LibraryPanel';
import { MembersPanel, RoleBadge } from '@/components/room/MembersPanel';
import { PlayerControls } from '@/components/room/PlayerControls';
import { Playlist } from '@/components/room/Playlist';
import { SaveToPlaylist } from '@/components/room/SaveToPlaylist';
import { SyncedPlayer } from '@/components/room/SyncedPlayer';
import { useRoom, type ConnectionStatus } from '@/components/room/useRoom';
import { VolumePanel } from '@/components/room/VolumePanel';
import { useI18n } from '@/i18n/client';
import { forgetJoin, getJoinedName, getNickname, rememberJoin, setNickname } from '@/lib/client-identity';
import { canControl as canControlRole, type AckResult } from '@/lib/room-types';
import type { RoomSong, Video } from '@/lib/validation';

type Props = {
    code: string;
    user: { username: string; avatarUrl: string | null } | null;
    /** Whether YouTube search is configured on the server (otherwise link-only mode). */
    searchAvailable: boolean;
};

const VOLUME_KEY = 'norabox:volume';
const MUTED_KEY = 'norabox:muted';
type Tab = 'playlist' | 'search' | 'library' | 'people';
const TAB_IDS: Tab[] = ['playlist', 'search', 'library', 'people'];
const tabKey = (code: string) => `norabox:tab:${code.toLowerCase()}`;

function readStoredVolume() {
    try {
        const v = Number(localStorage.getItem(VOLUME_KEY));
        return Number.isFinite(v) && localStorage.getItem(VOLUME_KEY) !== null ? Math.min(100, Math.max(0, v)) : 80;
    } catch {
        return 80;
    }
}

function readStored(storage: 'local' | 'session', key: string) {
    try {
        return (storage === 'local' ? localStorage : sessionStorage).getItem(key);
    } catch {
        return null;
    }
}

function writeStored(storage: 'local' | 'session', key: string, value: string) {
    try {
        (storage === 'local' ? localStorage : sessionStorage).setItem(key, value);
    } catch {}
}

export function RoomClient({ code, user, searchAvailable }: Props) {
    // `name` stays null until the visitor presses Join (that click also unlocks audio).
    // After a refresh, the name this tab joined with is restored and we rejoin directly.
    const rejoinName = useSyncExternalStore(noopSubscribe, () => getJoinedName(code), () => null);
    const [joinedName, setJoinedName] = useState<string | null>(null);
    const name = joinedName ?? rejoinName;
    const room = useRoom(code, name);
    const { t, tError } = useI18n();

    // A failed join (e.g. the room was removed) shouldn't auto-retry on the next refresh.
    useEffect(() => {
        if (room.fatal) forgetJoin(code);
    }, [room.fatal, code]);

    function join(n: string) {
        rememberJoin(code, n);
        setJoinedName(n);
    }

    if (name === null) return <JoinGate code={code} user={user} onJoin={join} />;
    if (room.fatal) {
        return (
            <div className="mx-auto max-w-md px-4 py-16 text-center">
                <h1 className="text-2xl font-bold">{t.room.cantJoin}</h1>
                <p className="mt-2 muted">{tError(room.fatal)}</p>
                <Link href="/" className="btn-primary mt-6">
                    {t.common.backHome}
                </Link>
            </div>
        );
    }
    if (!room.snapshot) {
        return <p className="py-24 text-center muted">{t.room.joining(code)}</p>;
    }
    return <RoomView code={code} room={room as RoomReady} signedIn={!!user} searchAvailable={searchAvailable} />;
}

const noopSubscribe = () => () => {};

type RoomReady = ReturnType<typeof useRoom> & { snapshot: NonNullable<ReturnType<typeof useRoom>['snapshot']> };

function JoinGate({ code, user, onJoin }: { code: string; user: Props['user']; onJoin: (name: string) => void }) {
    // The saved nickname only exists in the browser; read it without a hydration mismatch.
    const saved = useSyncExternalStore(noopSubscribe, getNickname, () => '');
    const [typed, setNick] = useState<string | null>(null);
    const nick = typed ?? saved;
    const { t } = useI18n();

    function submit(e: React.SubmitEvent) {
        e.preventDefault();
        if (user) return onJoin(user.username);
        const n = nick.trim().slice(0, 24);
        if (!n) return;
        setNickname(n);
        onJoin(n);
    }

    return (
        <div className="mx-auto max-w-md px-4 py-12 sm:py-20">
            <form onSubmit={submit} className="card p-6 text-center sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-wider text-moss">{t.room.invitedTo}</p>
                <h1 className="mt-2 break-all font-mono text-3xl font-bold">{code}</h1>
                {user ? (
                    <div className="mt-6 flex items-center justify-center gap-3">
                        <Avatar name={user.username} src={user.avatarUrl} size="md" />
                        <span className="font-medium">{t.room.joiningAs(user.username)}</span>
                    </div>
                ) : (
                    <div className="mt-6 text-left">
                        <label htmlFor="nick" className="label">
                            {t.room.displayName}
                        </label>
                        <input
                            id="nick"
                            className="input"
                            value={nick}
                            onChange={(e) => setNick(e.target.value)}
                            maxLength={24}
                            placeholder={t.room.displayNamePlaceholder}
                            autoFocus
                            autoComplete="nickname"
                        />
                    </div>
                )}
                <button className="btn-primary mt-6 w-full" disabled={!user && !nick.trim()}>
                    {t.room.joinAndListen}
                </button>
                <p className="mt-3 text-xs text-lime/45">{t.room.joinHint}</p>
            </form>
        </div>
    );
}

/** Admin-only: "Hide all" / "Show all" above the playlist, with a note on how hidden songs behave. */
function HideAllBar({
    items,
    currentId,
    onHideAll,
}: {
    items: RoomReady['snapshot']['items'];
    currentId: string | null;
    onHideAll: (hidden: boolean) => void;
}) {
    const { t } = useI18n();
    const anyHidden = items.some((i) => i.hidden);
    // Everything but the selected song (which can't be hidden) is already hidden.
    const allHidden = items.every((i) => i.hidden || i.id === currentId);
    return (
        <div className="mb-2 space-y-1.5">
            <div className="flex flex-wrap justify-end gap-1.5">
                {anyHidden && (
                    <button
                        type="button"
                        onClick={() => onHideAll(false)}
                        title={t.playlist.showAllHint}
                        className="btn-ghost gap-1 px-2 py-1 text-xs">
                        <Icon as={LuEye} className="size-3.5" />
                        {t.playlist.showAll}
                    </button>
                )}
                {!allHidden && (
                    <button
                        type="button"
                        onClick={() => onHideAll(true)}
                        title={t.playlist.hideAllHint}
                        className="btn-ghost gap-1 px-2 py-1 text-xs">
                        <Icon as={LuEyeOff} className="size-3.5" />
                        {t.playlist.hideAll}
                    </button>
                )}
            </div>
            {anyHidden && <p className="text-xs text-lime/45">{t.room.hiddenHint}</p>}
        </div>
    );
}

const STATUS_STYLE: Record<ConnectionStatus, string> = {
    connected: 'bg-moss',
    connecting: 'bg-lime/50 animate-pulse',
    reconnecting: 'bg-danger animate-pulse',
    error: 'bg-danger',
};

function StatusDot({ status }: { status: ConnectionStatus }) {
    const { t } = useI18n();
    const cls = STATUS_STYLE[status];
    const label = t.room.status[status];
    return (
        <span className="inline-flex items-center gap-1.5 text-xs muted">
            <span className={`size-2 rounded-full ${cls}`} />
            {label}
        </span>
    );
}

function RoomView({
    code,
    room,
    signedIn,
    searchAvailable,
}: {
    code: string;
    room: RoomReady;
    signedIn: boolean;
    searchAvailable: boolean;
}) {
    const router = useRouter();
    const { t, tError } = useI18n();
    const { snapshot, memberId, status, positionOf, act, report } = room;
    const me = snapshot.members.find((m) => m.memberId === memberId);
    const role = me?.role ?? 'listener';
    const isAdmin = role === 'admin';
    const canControl = canControlRole(role);
    const current = snapshot.items.find((i) => i.id === snapshot.playback.itemId) ?? null;

    // RoomView only renders after the socket joins, so it never runs on the server
    // and can read browser storage directly to restore the state from before a refresh.
    const [tab, setTabState] = useState<Tab>(() => {
        const saved = readStored('session', tabKey(code)) as Tab | null;
        return saved && TAB_IDS.includes(saved) ? saved : 'playlist';
    });
    const [toast, setToast] = useState<string | null>(null);
    const [personal, setPersonal] = useState(readStoredVolume);
    const [muted, setMutedState] = useState(() => readStored('local', MUTED_KEY) === '1');

    function setTab(t: Tab) {
        setTabState(t);
        writeStored('session', tabKey(code), t);
    }

    function setMuted(m: boolean) {
        setMutedState(m);
        writeStored('local', MUTED_KEY, m ? '1' : '0');
    }

    function leave() {
        forgetJoin(code);
        router.push('/');
    }

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 3500);
        return () => clearTimeout(t);
    }, [toast]);

    const run = useCallback(
        async (event: Parameters<typeof act>[0], payload?: unknown): Promise<AckResult> => {
            const res = await act(event, payload);
            if (!res.ok) setToast(tError(res.error));
            return res;
        },
        [act, tError],
    );

    function changePersonal(v: number) {
        setPersonal(v);
        setMuted(false);
        writeStored('local', VOLUME_KEY, String(v));
    }

    const effectiveVolume = muted ? 0 : Math.round((snapshot.masterVolume * personal) / 100);
    const expectedPosition = useCallback(() => positionOf(snapshot.playback), [positionOf, snapshot.playback]);
    const addedIds = useMemo(() => new Set(snapshot.items.map((i) => i.videoId)), [snapshot.items]);

    async function addVideo(video: Video) {
        const res = await run('playlist:add', { video });
        if (res.ok) setToast(t.room.added(video.title));
        return null;
    }

    /** Adds songs from the Library tab: one event for a single song, one batch for several. */
    async function addVideos(videos: RoomSong[]) {
        const res =
            videos.length === 1
                ? await run('playlist:add', { video: videos[0] })
                : await run('playlist:addMany', { videos });
        if (res.ok) setToast(videos.length === 1 ? t.room.added(videos[0].title) : t.likedTab.added(videos.length));
        return res.ok;
    }

    const inviteLink = () => `${window.location.origin}/room/${code}`;
    const TABS: { id: Tab; label: string }[] = [
        { id: 'playlist', label: t.room.tabs.playlist(snapshot.items.length) },
        { id: 'search', label: t.room.tabs.search },
        { id: 'library', label: t.room.tabs.library },
        { id: 'people', label: t.room.tabs.people(snapshot.members.length) },
    ];

    return (
        <div className="mx-auto max-w-6xl px-4 py-6">
            {/* Room header */}
            <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <StatusDot status={status} />
                        <RoleBadge role={role} />
                        {snapshot.locked && (
                            <span
                                title={t.room.closedBadgeHint}
                                className="inline-flex items-center gap-1 rounded-full border border-leaf/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-lime/80">
                                <Icon as={LuLock} className="size-3" />
                                {t.room.closedBadge}
                            </span>
                        )}
                    </div>
                    <h1 className="mt-1 break-all font-mono text-2xl font-bold sm:text-3xl">{snapshot.code}</h1>
                </div>
                <div className="flex w-full gap-2 sm:ml-auto sm:w-auto">
                    <CopyButton
                        text={snapshot.code}
                        label={t.room.copyCode}
                        className="btn-primary flex-1 sm:flex-none"
                    />
                    <CopyButton text={inviteLink} label={t.room.copyLink} className="btn-secondary flex-1 sm:flex-none" />
                    <button type="button" onClick={leave} className="btn-ghost">
                        {t.room.leave}
                    </button>
                </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
                {/* Player column */}
                <div className="space-y-5">
                    <div className="card space-y-5 p-3 sm:p-5">
                        <SyncedPlayer
                            videoId={current?.videoId ?? null}
                            itemId={current?.id ?? null}
                            playback={snapshot.playback}
                            expectedPosition={expectedPosition}
                            volume={effectiveVolume}
                            onEnded={(itemId) => report('player:ended', { itemId })}
                            onDuration={(itemId, duration) => report('player:duration', { itemId, duration })}
                        />
                        <div className="px-1 sm:px-0">
                            <PlayerControls
                                current={current}
                                playback={snapshot.playback}
                                loopMode={snapshot.loopMode}
                                canControl={canControl}
                                hasItems={snapshot.items.length > 0}
                                positionOf={positionOf}
                                act={run}
                            />
                        </div>
                    </div>
                    <div className="card p-4 sm:p-5">
                        <VolumePanel
                            personal={personal}
                            muted={muted}
                            onPersonal={changePersonal}
                            onToggleMute={() => setMuted(!muted)}
                            master={snapshot.masterVolume}
                            isAdmin={isAdmin}
                            onMaster={(v) => run('room:masterVolume', { volume: v })}
                        />
                    </div>
                </div>

                {/* Side panel */}
                <div className="card flex min-h-[24rem] flex-col p-3 sm:p-4 lg:max-h-[calc(100vh-10rem)] lg:sticky lg:top-20">
                    <div role="tablist" className="mb-3 grid grid-cols-4 gap-1 rounded-xl bg-pine/60 p-1">
                        {TABS.map((t) => (
                            <button
                                key={t.id}
                                role="tab"
                                aria-selected={tab === t.id}
                                onClick={() => setTab(t.id)}
                                className={`truncate rounded-lg px-2 py-2 text-xs font-semibold transition sm:text-sm ${
                                    tab === t.id ? 'bg-moss text-pine' : 'text-lime/70 hover:bg-fern/60'
                                }`}>
                                {t.label}
                            </button>
                        ))}
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-1">
                        {tab === 'playlist' && (
                            <>
                                {canControl && snapshot.items.length > 1 && (
                                    <p className="mb-2 text-xs text-lime/45">{t.room.dragHint}</p>
                                )}
                                {isAdmin && snapshot.items.length > 0 && (
                                    <HideAllBar
                                        items={snapshot.items}
                                        currentId={snapshot.playback.itemId}
                                        onHideAll={(hidden) => run('playlist:hideAll', { hidden })}
                                    />
                                )}
                                <Playlist
                                    items={snapshot.items}
                                    editable={canControl}
                                    currentId={snapshot.playback.itemId}
                                    isPlaying={snapshot.playback.isPlaying}
                                    onReorder={(orderedIds) => run('playlist:reorder', { orderedIds })}
                                    onRemove={(itemId) => run('playlist:remove', { itemId })}
                                    onSelect={canControl ? (itemId) => run('player:select', { itemId }) : undefined}
                                    onMemo={
                                        isAdmin
                                            ? async (itemId, memo) => (await run('playlist:memo', { itemId, memo })).ok
                                            : undefined
                                    }
                                    onToggleHidden={
                                        isAdmin ? (itemId, hidden) => run('playlist:hide', { itemId, hidden }) : undefined
                                    }
                                    actions={
                                        signedIn
                                            ? ({ videoId, title, channel, thumbnail, durationSec, memo }) => (
                                                  <SaveToPlaylist
                                                      video={{ videoId, title, channel, thumbnail, durationSec, memo }}
                                                      onMessage={setToast}
                                                  />
                                              )
                                            : undefined
                                    }
                                    emptyText={canControl ? t.room.emptyControl : t.room.emptyListen}
                                />
                            </>
                        )}
                        {tab === 'search' && (
                            <VideoSearch
                                onAdd={addVideo}
                                searchAvailable={searchAvailable}
                                addedIds={addedIds}
                                disabled={!canControl}
                                disabledReason={t.room.searchDenied}
                            />
                        )}
                        {tab === 'library' && (
                            <LibraryPanel
                                canControl={canControl}
                                signedIn={signedIn}
                                addedIds={addedIds}
                                onAdd={addVideos}
                                onMessage={setToast}
                            />
                        )}
                        {tab === 'people' && (
                            <MembersPanel
                                members={snapshot.members}
                                meId={memberId}
                                isAdmin={isAdmin}
                                setRole={(id, r) => run('member:setRole', { memberId: id, role: r })}
                                locked={snapshot.locked}
                                setLocked={(locked) => run('room:lock', { locked })}
                            />
                        )}
                    </div>
                </div>
            </div>

            {toast && (
                <div
                    role="status"
                    className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-sm rounded-xl border border-leaf bg-pine/95 px-4 py-3 text-sm shadow-2xl">
                    {toast}
                </div>
            )}
        </div>
    );
}
