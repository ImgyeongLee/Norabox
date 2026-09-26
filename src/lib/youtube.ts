import type { Video } from "@/lib/validation";

const API = "https://www.googleapis.com/youtube/v3";

export class YouTubeError extends Error {}

/** Extracts an 11-char video id from a YouTube URL or a bare id. */
export function parseVideoId(input: string): string | null {
  const s = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  let url: URL;
  try {
    url = new URL(s);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|music)\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id = url.searchParams.get("v");
    const m = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/);
    if (!id && m) id = m[1];
  }
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
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

async function api<T>(path: string, params: Record<string, string>): Promise<T> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new YouTubeError("YouTube search is not configured (missing YOUTUBE_API_KEY). You can still paste a YouTube link.");
  const qs = new URLSearchParams({ ...params, key });
  const res = await fetch(`${API}/${path}?${qs}`, { cache: "no-store" });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new YouTubeError(body?.error?.message ?? `YouTube API error (${res.status})`);
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

/** Looks up a single video. Falls back to oEmbed (no API key needed, no duration). */
export async function getVideo(id: string): Promise<Video | null> {
  if (process.env.YOUTUBE_API_KEY) {
    const [v] = await videosById([id]);
    return v ?? null;
  }
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
