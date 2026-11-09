import type { ErrorCode } from "@/i18n/messages/en";
import { MAX_MEMO } from "@/lib/limits";
import { parsePlaylistId, parseVideoId } from "@/lib/youtube-url";

// The playlist editor's "Paste a list": one song per line, a YouTube link and an optional memo after
// the first comma ("https://youtu.be/…, When the party enters the crypt"). Rows copied from a
// spreadsheet are tab-separated, so a tab works too. A header row at the top ("youtube_url, note")
// is skipped. A YouTube playlist link (with no video in it) stands for all of that playlist's songs.
// Safe to use in the browser.

/**
 * `line` is 1-based, counting every line of the pasted text (blank ones too); `text` is that line.
 * `fromPlaylist` is set for songs a playlist link on that line stands for.
 */
export type SongRow = { line: number; text: string; videoId: string; memo: string; fromPlaylist?: boolean };
export type SongRowFailure = { line: number; text: string; error: ErrorCode };

/** `"a ""b"", c"` → `a "b", c`, as spreadsheets quote a field with commas or quotes in it. */
function unquote(field: string) {
  const s = field.trim();
  return s.length >= 2 && s.startsWith('"') && s.endsWith('"') ? s.slice(1, -1).replace(/""/g, '"').trim() : s;
}

/** Each non-blank line's link and memo. */
function* lines(pasted: string) {
  for (const [i, raw] of pasted.split(/\r?\n/).entries()) {
    const text = raw.trim();
    if (!text) continue;
    const sep = text.includes("\t") ? text.indexOf("\t") : text.indexOf(",");
    const link = unquote(sep < 0 ? text : text.slice(0, sep));
    yield { line: i + 1, text, link, memo: sep < 0 ? "" : unquote(text.slice(sep + 1)) };
  }
}

/** The playlist a link points at, when it's a playlist link without a particular video in it. */
const playlistOnly = (link: string) => (parseVideoId(link) ? null : parsePlaylistId(link));

/** The YouTube playlists the pasted text links to, to read their songs before parseSongList. */
export function playlistIdsIn(text: string): string[] {
  const ids = new Set<string>();
  for (const { link } of lines(text)) {
    const id = playlistOnly(link);
    if (id) ids.add(id);
  }
  return [...ids];
}

/**
 * Splits pasted text into songs to look up and lines that can't be added: not a YouTube link,
 * a memo that's too long, a song the playlist (`existingIds`) or an earlier line already has, no
 * room left once `slots` songs have been taken, or a playlist that couldn't be opened. `playlists`
 * holds the songs of each linked playlist (null if it couldn't be read). From a playlist, songs
 * already taken are quietly left out (counted in `skipped`); the line fails only when some songs
 * didn't fit. Blank lines are skipped.
 */
export function parseSongList(
  pasted: string,
  existingIds: Iterable<string>,
  slots: number,
  playlists: ReadonlyMap<string, string[] | null> = new Map(),
) {
  const rows: SongRow[] = [];
  const failures: SongRowFailure[] = [];
  const existing = new Set(existingIds);
  const seen = new Set<string>();
  const taken = (id: string) => existing.has(id) || seen.has(id);
  let skipped = 0;
  let first = true;

  for (const { line, text, link, memo } of lines(pasted)) {
    const fail = (error: ErrorCode) => failures.push({ line, text, error });
    // Only full links: a bare video id is 11 letters, which a header like "youtube_url" also is.
    const isLink = link.includes("/");
    const header = first && !isLink;
    first = false;
    if (header) continue;
    // A link is either one video or a whole playlist (a video opened from a playlist is the video).
    const videoId = isLink ? parseVideoId(link) : null;
    const listId = isLink && !videoId ? parsePlaylistId(link) : null;
    if (!videoId && !listId) {
      fail("songLinkInvalid");
      continue;
    }
    if (memo.length > MAX_MEMO) {
      fail("memoLong");
      continue;
    }

    if (videoId) {
      if (existing.has(videoId)) fail("importDuplicate");
      else if (seen.has(videoId)) fail("importRepeated");
      else if (rows.length >= slots) fail("importNoRoom");
      else {
        seen.add(videoId);
        rows.push({ line, text, videoId, memo });
      }
      continue;
    }

    const ids = listId && playlists.get(listId);
    if (!ids) {
      fail("playlistUnavailable");
      continue;
    }
    let full = false;
    for (const id of ids) {
      if (taken(id)) skipped++;
      else if (rows.length >= slots) full = true;
      else {
        seen.add(id);
        rows.push({ line, text, videoId: id, memo, fromPlaylist: true });
      }
    }
    if (full) fail("importNoRoom");
  }
  return { rows, failures, skipped };
}
