'use client';

/* eslint-disable @next/next/no-img-element -- YouTube thumbnails */
import { useState } from 'react';
import { LuLink, LuListMusic, LuSearch } from 'react-icons/lu';
import { Icon, PlayIcon } from '@/components/icons';
import { useI18n } from '@/i18n/client';
import { formatDuration } from '@/lib/format';
import { MAX_PLAYLIST_IMPORT } from '@/lib/limits';
import type { Video } from '@/lib/validation';
import type { YouTubePlaylist } from '@/lib/youtube';
import { playlistVideoIds } from '@/lib/youtube-iframe';
import { parsePlaylistId, parseVideoId } from '@/lib/youtube-url';

type Props = {
  /** `play`: "Play now", which also adds the song and starts it right away. */
  onAdd: (video: Video, play?: boolean) => Promise<string | null | void> | string | null | void;
  /** Video ids already in the list, shown as "Added" (and left out when adding a whole playlist). */
  addedIds?: Set<string>;
  /**
   * Set to offer "Add all" for a pasted YouTube playlist link. Resolves true when every song was added.
   * `spaceLeft` caps how many it may add.
   */
  onAddMany?: (videos: Video[]) => Promise<boolean>;
  spaceLeft?: number;
  disabled?: boolean;
  disabledReason?: string;
  /** False when the server has no YouTube API key: only link mode is offered. */
  searchAvailable?: boolean;
};

type Mode = 'search' | 'link';

// YouTube's daily quota resets at midnight Pacific Time. After it runs out, this
// browser starts in link mode for the rest of that (Pacific) day.
const QUOTA_KEY = 'norabox:searchQuotaDay';
const pacificDay = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());

function quotaHitToday() {
  try {
    return localStorage.getItem(QUOTA_KEY) === pacificDay();
  } catch {
    return false;
  }
}

function rememberQuotaHit() {
  try {
    localStorage.setItem(QUOTA_KEY, pacificDay());
  } catch {}
}

/**
 * Add songs from YouTube: search (uses the API's daily search quota) or paste a
 * link ("link-only mode", no quota). Switches to link mode when search runs out.
 * Only rendered after a room is joined, so reading localStorage on first render is safe.
 */
export function VideoSearch({
  onAdd,
  addedIds,
  onAddMany,
  spaceLeft = Infinity,
  disabled,
  disabledReason,
  searchAvailable = true,
}: Props) {
  const { t, tError } = useI18n();
  const [quotaHit, setQuotaHit] = useState(quotaHitToday);
  const [mode, setMode] = useState<Mode>(() => (searchAvailable && !quotaHitToday() ? 'search' : 'link'));
  const [query, setQuery] = useState('');
  const [link, setLink] = useState('');
  const [results, setResults] = useState<Video[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  /** The button waiting for its add to finish. */
  const [pending, setPending] = useState<{ videoId: string; play: boolean } | null>(null);
  // A pasted link with a YouTube playlist in it (link mode only).
  const [playlist, setPlaylist] = useState<YouTubePlaylist | null>(null);
  const [playlistError, setPlaylistError] = useState<string | null>(null);
  const [addingAll, setAddingAll] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setResults(null);
    setError(null);
    setPlaylist(null);
    setPlaylistError(null);
  }

  // Not a <form>: Enter is handled here so it never submits an outer form.
  async function search() {
    const q = query.trim();
    if (!q) return;
    // A playlist link can't be searched for: load it in link mode instead.
    if (onAddMany && parsePlaylistId(q)) {
      setMode('link');
      return changeLink(q);
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'youtubeFailed');
      setResults(data.results);
    } catch (err) {
      const code = err instanceof Error ? err.message : 'youtubeFailed';
      setResults(null);
      if (code === 'youtubeQuota' || code === 'youtubeNotConfigured') {
        // Out of search for today: explain once and continue in link-only mode.
        if (code === 'youtubeQuota') rememberQuotaHit();
        setQuotaHit(code === 'youtubeQuota');
        setMode('link');
        // A pasted link in the search box carries over.
        if (parseVideoId(q)) changeLink(q);
      } else {
        setError(code);
      }
    } finally {
      setLoading(false);
    }
  }

  /**
   * Link mode: look the video up as soon as a valid YouTube link is pasted, and its playlist too when
   * it has one (a video opened from a playlist has both).
   */
  async function changeLink(value: string) {
    setLink(value);
    setResults(null);
    setPlaylist(null);
    setPlaylistError(null);
    const trimmed = value.trim();
    if (!trimmed) return setError(null);
    const videoId = parseVideoId(trimmed);
    const listId = onAddMany ? parsePlaylistId(trimmed) : null;
    if (!videoId && !listId) return setError('notAYouTubeLink');
    setError(null);
    setLoading(true);
    await Promise.all([
      videoId &&
        lookup(`/api/youtube/video?url=${encodeURIComponent(trimmed)}`, 'videoLookupFailed').then(
          (data) => setResults([data.video]),
          (code: string) => setError(code),
        ),
      // The song list comes from YouTube's player in this browser, the details from our server:
      // neither uses the YouTube API's quota.
      listId &&
        playlistVideoIds(listId)
          .then((ids) => lookup(`/api/youtube/playlist?list=${listId}&ids=${ids.join(',')}`, 'playlistLookupFailed'))
          .then(
            (data) => setPlaylist(data.playlist),
            (e: unknown) => setPlaylistError(e instanceof Error ? e.message : String(e)),
          ),
    ]);
    setLoading(false);
  }

  async function addPlaylist(videos: Video[]) {
    setAddingAll(true);
    const ok = await onAddMany!(videos);
    setAddingAll(false);
    if (ok) {
      setLink('');
      setResults(null);
      setPlaylist(null);
    }
  }

  async function add(v: Video, play = false) {
    setPending({ videoId: v.videoId, play });
    const err = await onAdd(v, play);
    setPending(null);
    if (err) setError(err);
    else if (mode === 'link') {
      setLink('');
      setResults(null);
    }
  }

  const modes: { id: Mode; label: string; icon: typeof LuSearch }[] = [
    { id: 'search', label: t.search.modeSearch, icon: LuSearch },
    { id: 'link', label: t.search.modeLink, icon: LuLink },
  ];

  return (
    <div>
      {searchAvailable && (
        <div role="tablist" aria-label={t.search.modesLabel} className="mb-3 inline-flex rounded-lg bg-pine/60 p-0.5">
          {modes.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={mode === m.id}
              onClick={() => switchMode(m.id)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                mode === m.id ? 'bg-moss text-pine' : 'text-lime/70 hover:text-lime'
              }`}>
              <Icon as={m.icon} className="size-3.5" />
              {m.label}
            </button>
          ))}
        </div>
      )}

      {quotaHit && mode === 'link' && (
        <p role="status" className="mb-3 rounded-xl border border-moss/50 bg-moss/10 px-3 py-2.5 text-sm text-lime/90">
          {tError('youtubeQuota')}
        </p>
      )}

      {mode === 'search' ? (
        <div className="flex gap-2" role="search">
          <input
            type="search"
            className="input"
            placeholder={t.search.placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              e.preventDefault();
              if (!loading) search();
            }}
            aria-label={t.search.label}
            disabled={disabled}
          />
          <button
            type="button"
            onClick={search}
            className="btn-primary shrink-0"
            disabled={disabled || loading || !query.trim()}>
            {loading ? '…' : t.search.button}
          </button>
        </div>
      ) : (
        <div>
          <input
            type="url"
            inputMode="url"
            className="input"
            placeholder={t.search.linkPlaceholder}
            value={link}
            onChange={(e) => changeLink(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
            aria-label={t.search.linkLabel}
            disabled={disabled}
          />
          {!link && !quotaHit && <p className="mt-1.5 text-xs text-lime/50">{t.search.linkHint}</p>}
          {loading && (
            <p className="mt-2 text-sm text-lime/55">
              {onAddMany && parsePlaylistId(link) ? t.search.loadingPlaylist : t.search.loadingLink}
            </p>
          )}
        </div>
      )}

      {disabled && disabledReason && <p className="mt-2 text-sm muted">{disabledReason}</p>}
      {error && <p className="field-error">{tError(error)}</p>}
      {playlistError && <p className="field-error">{tError(playlistError)}</p>}
      {playlist && (
        <PlaylistCard
          playlist={playlist}
          addedIds={addedIds}
          spaceLeft={spaceLeft}
          busy={addingAll}
          disabled={disabled}
          onAdd={addPlaylist}
        />
      )}
      {mode === 'search' && results && results.length === 0 && (
        <p className="mt-4 text-sm muted">{t.search.noResults}</p>
      )}
      {results && results.length > 0 && (
        <ul className="mt-3 divide-y divide-leaf/25">
          {results.map((v) => {
            const added = addedIds?.has(v.videoId);
            const busy = pending?.videoId === v.videoId;
            return (
              <li key={v.videoId} className="flex items-center gap-3 py-2.5">
                <img src={v.thumbnail} alt="" className="aspect-video w-24 shrink-0 rounded-lg object-cover sm:w-28" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium leading-snug">{v.title}</p>
                  <p className="mt-0.5 truncate text-xs text-lime/55">
                    {v.channel}
                    {v.durationSec ? ` · ${formatDuration(v.durationSec)}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
                  <button
                    type="button"
                    className={added ? 'btn-ghost px-3 py-2' : 'btn-secondary px-3 py-2'}
                    disabled={disabled || busy}
                    onClick={() => add(v)}
                    aria-label={t.search.addLabel(v.title)}>
                    {busy && !pending.play ? '…' : added ? t.search.addAgain : t.search.add}
                  </button>
                  <button
                    type="button"
                    className="btn-primary gap-1 px-3 py-2"
                    disabled={disabled || busy}
                    onClick={() => add(v, true)}
                    aria-label={t.search.playLabel(v.title)}>
                    {busy && pending.play ? (
                      '…'
                    ) : (
                      <>
                        <PlayIcon className="size-3.5" />
                        {t.search.play}
                      </>
                    )}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Resolves with the JSON of a successful lookup; rejects with the error code otherwise. */
async function lookup(url: string, fallback: string) {
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw 'network';
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data.error ?? fallback;
  return data;
}

/** A pasted YouTube playlist: its title, what will be added, and why the rest won't be. */
function PlaylistCard({
  playlist,
  addedIds,
  spaceLeft,
  busy,
  disabled,
  onAdd,
}: {
  playlist: YouTubePlaylist;
  addedIds?: Set<string>;
  spaceLeft: number;
  busy: boolean;
  disabled?: boolean;
  onAdd: (videos: Video[]) => void;
}) {
  const { t } = useI18n();
  const fresh = playlist.videos.filter((v) => !addedIds?.has(v.videoId));
  const toAdd = fresh.slice(0, Math.max(0, spaceLeft));
  const notes = [
    // YouTube's player gives at most this many, so a longer playlist is cut off there.
    playlist.total >= MAX_PLAYLIST_IMPORT && t.search.playlistCapped(MAX_PLAYLIST_IMPORT),
    playlist.total > playlist.videos.length && t.search.playlistUnplayable(playlist.total - playlist.videos.length),
    fresh.length < playlist.videos.length && t.search.playlistInRoom(playlist.videos.length - fresh.length),
    toAdd.length < fresh.length && t.search.playlistNoSpace(toAdd.length),
  ].filter((n): n is string => !!n);

  return (
    <div className="mt-3 rounded-xl border border-moss/50 bg-moss/10 p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-moss">
        <Icon as={LuListMusic} className="size-3.5" />
        {t.search.playlistLabel}
      </p>
      <p className="mt-1 line-clamp-2 font-semibold leading-snug">{playlist.title ?? t.search.playlistUntitled}</p>
      <p className="mt-0.5 text-xs text-lime/60">{t.common.songs(playlist.videos.length)}</p>
      {notes.length > 0 && (
        <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs text-lime/60">
          {notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
      <button
        type="button"
        className="btn-primary mt-3 w-full"
        disabled={disabled || busy || toAdd.length === 0}
        onClick={() => onAdd(toAdd)}>
        {busy ? '…' : t.search.playlistAdd(toAdd.length)}
      </button>
    </div>
  );
}
