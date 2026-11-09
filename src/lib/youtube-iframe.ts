"use client";

// Minimal typings + loader for the YouTube IFrame Player API.

export const YTState = { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 } as const;

export interface YTPlayer {
  loadVideoById(o: { videoId: string; startSeconds?: number }): void;
  cueVideoById(o: { videoId: string; startSeconds?: number }): void;
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  setVolume(v: number): void;
  mute(): void;
  unMute(): void;
  getVideoData(): { video_id?: string };
  /** The video ids of the playlist the player was opened with (YouTube holds up to 200). */
  getPlaylist(): string[] | null;
  destroy(): void;
}

type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      width?: string | number;
      height?: string | number;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (e: { target: YTPlayer }) => void;
        onStateChange?: (e: { data: number; target: YTPlayer }) => void;
        onError?: (e: { data: number }) => void;
      };
    },
  ) => YTPlayer;
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let loader: Promise<YTNamespace> | null = null;

export function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  loader ??= new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT!);
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.async = true;
    document.head.appendChild(tag);
  });
  return loader;
}

/**
 * The video ids of a YouTube playlist, read through a hidden embedded player: no API key and no
 * quota. YouTube's player holds up to 200 songs of a playlist. Rejects with "playlistUnavailable"
 * when the playlist can't be opened (private, deleted) or doesn't answer in time.
 */
export async function playlistVideoIds(listId: string, timeoutMs = 10_000): Promise<string[]> {
  const YT = await loadYouTubeApi();
  // Off screen, but at YouTube's minimum player size.
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = "position:fixed;left:-10000px;top:0;width:200px;height:200px;pointer-events:none";
  const mount = document.createElement("div");
  host.appendChild(mount);
  document.body.appendChild(host);

  return new Promise((resolve, reject) => {
    let player: YTPlayer | null = null;
    let poll: ReturnType<typeof setInterval> | undefined;
    const finish = (ids: string[] | null | undefined) => {
      clearInterval(poll);
      clearTimeout(timer);
      player?.destroy();
      host.remove();
      if (ids?.length) resolve(ids);
      else reject(new Error("playlistUnavailable"));
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    player = new YT.Player(mount, {
      width: 200,
      height: 200,
      playerVars: { listType: "playlist", list: listId, autoplay: 0, mute: 1 },
      events: {
        // The list arrives a moment after the player is ready.
        onReady: (e) => {
          poll = setInterval(() => {
            const ids = e.target.getPlaylist();
            if (ids?.length) finish(ids);
          }, 200);
        },
        // Also fires when only the first video can't be embedded; the list may still be there.
        onError: () => finish(player?.getPlaylist()),
      },
    });
  });
}
