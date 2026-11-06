import type { ErrorCode } from "@/i18n/messages/en";
import { MAX_MEMO } from "@/lib/limits";
import { parseVideoId } from "@/lib/youtube-url";

// The playlist editor's "Paste a list": one song per line, a YouTube link and an optional memo after
// the first comma ("https://youtu.be/…, When the party enters the crypt"). Rows copied from a
// spreadsheet are tab-separated, so a tab works too. A header row at the top ("youtube_url, note")
// is skipped. Safe to use in the browser.

/** `line` is 1-based, counting every line of the pasted text (blank ones too); `text` is that line. */
export type SongRow = { line: number; text: string; videoId: string; memo: string };
export type SongRowFailure = { line: number; text: string; error: ErrorCode };

/** `"a ""b"", c"` → `a "b", c`, as spreadsheets quote a field with commas or quotes in it. */
function unquote(field: string) {
  const s = field.trim();
  return s.length >= 2 && s.startsWith('"') && s.endsWith('"') ? s.slice(1, -1).replace(/""/g, '"').trim() : s;
}

/**
 * Splits pasted text into songs to look up and lines that can't be added: not a YouTube link,
 * a memo that's too long, a song the playlist (`existingIds`) or an earlier line already has, or
 * no room left once `slots` songs have been taken. Blank lines are skipped.
 */
export function parseSongList(text: string, existingIds: Iterable<string>, slots: number) {
  const rows: SongRow[] = [];
  const failures: SongRowFailure[] = [];
  const existing = new Set(existingIds);
  const seen = new Set<string>();
  let first = true;

  text.split(/\r?\n/).forEach((raw, i) => {
    const text = raw.trim();
    if (!text) return;
    const line = i + 1;
    const fail = (error: ErrorCode) => failures.push({ line, text, error });

    const sep = text.includes("\t") ? text.indexOf("\t") : text.indexOf(",");
    const link = unquote(sep < 0 ? text : text.slice(0, sep));
    const memo = sep < 0 ? "" : unquote(text.slice(sep + 1));
    // Only full links: a bare video id is 11 letters, which a header like "youtube_url" also is.
    const isLink = link.includes("/");
    const header = first && !isLink;
    first = false;
    if (header) return;
    const videoId = isLink ? parseVideoId(link) : null;
    if (!videoId) return fail("songLinkInvalid");
    if (memo.length > MAX_MEMO) return fail("memoLong");
    if (existing.has(videoId)) return fail("importDuplicate");
    if (seen.has(videoId)) return fail("importRepeated");
    if (rows.length >= slots) return fail("importNoRoom");
    seen.add(videoId);
    rows.push({ line, text, videoId, memo });
  });
  return { rows, failures };
}
