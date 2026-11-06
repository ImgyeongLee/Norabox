import type { Video } from "@/lib/validation";
import { parseVideoId } from "@/lib/youtube-url";

export { parseVideoId };

const API = "https://www.googleapis.com/youtube/v3";

/** `code` is an error code the UI translates; the message is for server logs. */
export class YouTubeError extends Error {
  constructor(
    readonly code: "youtubeNotConfigured" | "youtubeFailed" | "youtubeQuota",
    message: string = code,
  ) {
    super(message);
  }
}

/** Parses an ISO 8601 duration like "PT1H2M3S" into seconds. */
export function parseDuration(iso: string | undefined): number | null {
  if (!iso) return null;
  const m = iso.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return null;
  const [, d, h, min, s] = m.map((x) => Number(x ?? 0));
  const total = d * 86400 + h * 3600 + min * 60 + s;
  return total > 0 && total <= 86400 ? total : null;
}

function decodeEntities(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

type Thumbs = Record<string, { url: string } | undefined>;
const pickThumb = (t: Thumbs | undefined, id: string) =>
  t?.medium?.url ?? t?.high?.url ?? t?.default?.url ?? `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

const QUOTA_REASONS = new Set(["quotaExceeded", "dailyLimitExceeded", "rateLimitExceeded", "userRateLimitExceeded"]);

async function api<T>(path: string, params: Record<string, string>): Promise<T> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new YouTubeError("youtubeNotConfigured", "YOUTUBE_API_KEY is not set");
  const qs = new URLSearchParams({ ...params, key });
  const res = await fetch(`${API}/${path}?${qs}`, { cache: "no-store" });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: { message?: string; errors?: { reason?: string }[] };
    } | null;
    const detail = body?.error?.message ?? `YouTube API error (${res.status})`;
    const reason = body?.error?.errors?.[0]?.reason ?? "";
    // Daily quota (e.g. "Search Queries per day") or rate limits: tell users to paste a link instead.
    const quota =
      res.status === 429 || QUOTA_REASONS.has(reason) || /quota exceeded/i.test(detail);
    console.error("[youtube]", detail);
    throw new YouTubeError(quota ? "youtubeQuota" : "youtubeFailed", detail);
  }
  return res.json() as Promise<T>;
}

type VideosResponse = {
  items: {
    id: string;
    snippet: { title: string; channelTitle: string; thumbnails: Thumbs; liveBroadcastContent?: string };
    contentDetails: { duration: string };
    status?: { embeddable?: boolean };
  }[];
};

async function videosById(ids: string[]): Promise<Video[]> {
  if (ids.length === 0) return [];
  const data = await api<VideosResponse>("videos", {
    part: "snippet,contentDetails,status",
    id: ids.join(","),
    maxResults: String(ids.length),
  });
  const byId = new Map(data.items.map((v) => [v.id, v]));
  return ids.flatMap((id) => {
    const v = byId.get(id);
    if (!v || v.status?.embeddable === false) return [];
    return [
      {
        videoId: id,
        title: decodeEntities(v.snippet.title),
        channel: decodeEntities(v.snippet.channelTitle),
        thumbnail: pickThumb(v.snippet.thumbnails, id),
        // Live streams have no fixed length (YouTube reports a bogus duration).
        durationSec: v.snippet.liveBroadcastContent === "live" ? null : parseDuration(v.contentDetails.duration),
      },
    ];
  });
}

/** Looks up a single video. Falls back to oEmbed (no API key needed, no duration) without a key or quota. */
export async function getVideo(id: string): Promise<Video | null> {
  if (process.env.YOUTUBE_API_KEY) {
    try {
      const [v] = await videosById([id]);
      return v ?? null;
    } catch (e) {
      // Out of API quota: oEmbed needs no quota, so pasted links keep working.
      if (!(e instanceof YouTubeError && e.code === "youtubeQuota")) throw e;
    }
  }
  return videoFromOEmbed(id);
}

/**
 * Looks up several videos in one API call (up to 50); missing, private and non-embeddable ones are
 * left out. Falls back to oEmbed like getVideo.
 */
export async function getVideos(ids: string[]): Promise<Video[]> {
  if (process.env.YOUTUBE_API_KEY) {
    try {
      return await videosById(ids);
    } catch (e) {
      if (!(e instanceof YouTubeError && e.code === "youtubeQuota")) throw e;
    }
  }
  const videos = await Promise.all(ids.map(videoFromOEmbed));
  return videos.filter((v): v is Video => !!v);
}

/** Title and channel from YouTube's public oEmbed endpoint (no API key or quota; no duration). */
async function videoFromOEmbed(id: string): Promise<Video | null> {
  const res = await fetch(
    `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`,
    { cache: "no-store" },
  );
  if (!res.ok) return null;
  const o = (await res.json()) as { title: string; author_name: string };
  return {
    videoId: id,
    title: o.title,
    channel: o.author_name,
    thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
    durationSec: null,
  };
}

export async function searchVideos(query: string): Promise<Video[]> {
  const id = parseVideoId(query);
  if (id) {
    const v = await getVideo(id);
    return v ? [v] : [];
  }
  const data = await api<{ items: { id: { videoId?: string } }[] }>("search", {
    part: "snippet",
    type: "video",
    videoEmbeddable: "true",
    maxResults: "12",
    q: query,
  });
  const ids = data.items.map((i) => i.id.videoId).filter((x): x is string => !!x);
  return videosById(ids);
}
