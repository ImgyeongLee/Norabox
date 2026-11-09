/** The URL if `input` is a link to YouTube (www., m., music., youtu.be or youtube-nocookie.com). */
function youtubeUrl(input: string): { url: URL; host: string } | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|music)\./, "");
  return host === "youtu.be" || host === "youtube.com" || host === "youtube-nocookie.com" ? { url, host } : null;
}

/** Extracts an 11-char video id from a YouTube URL or a bare id. Safe to use in the browser. */
export function parseVideoId(input: string): string | null {
  const s = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  const yt = youtubeUrl(s);
  if (!yt) return null;
  const { url, host } = yt;
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0];
  else {
    id = url.searchParams.get("v");
    const m = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/);
    if (!id && m) id = m[1];
  }
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}

/**
 * The playlist id (`list=`) of a YouTube link: a playlist page, or a video opened from a playlist
 * (which then has a video id too). Safe to use in the browser.
 */
export function parsePlaylistId(input: string): string | null {
  const id = youtubeUrl(input)?.url.searchParams.get("list");
  return id && /^[A-Za-z0-9_-]{2,64}$/.test(id) ? id : null;
}
