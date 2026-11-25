import { DRAFT_TTL_DAYS, MAX_DRAFTS } from '@/lib/limits';
import type { Video } from '@/lib/validation';
import { VISIBILITY_OPTIONS, type Visibility } from '@/lib/visibility';

// Drafts of new playlists, saved with Ctrl+S on /playlists/new. They live only in the browser's
// localStorage (one list per account), so saving, listing and opening them never calls the server.
// Each song keeps its looked-up video, so opening a draft doesn't look the songs up again.
// Functions take the Storage to use, so tests can pass a stand-in.

export type DraftTrack = { link: string; video: Video | null; memo: string };

export type Draft = {
    id: string;
    /** Last save, in ms since the epoch. */
    updatedAt: number;
    title: string;
    scenario: string;
    writer: string;
    visibility: Visibility;
    anonymous: boolean;
    tracks: DraftTrack[];
};

export type DraftContent = Omit<Draft, 'id' | 'updatedAt'>;

export type SaveResult = { ok: true; id: string } | { ok: false; reason: 'full' | 'empty' | 'storage' };

export const DRAFT_TTL_MS = DRAFT_TTL_DAYS * 24 * 60 * 60 * 1000;

/** The localStorage key holding one account's drafts. */
export const draftsKey = (owner: string) => `norabox:drafts:${owner}`;
const keyFor = draftsKey;

const isString = (v: unknown): v is string => typeof v === 'string';

function isVideo(v: unknown): v is Video {
    if (!v || typeof v !== 'object') return false;
    const o = v as Record<string, unknown>;
    return (
        isString(o.videoId) &&
        isString(o.title) &&
        isString(o.channel) &&
        isString(o.thumbnail) &&
        (o.durationSec === null || typeof o.durationSec === 'number')
    );
}

function isTrack(v: unknown): v is DraftTrack {
    if (!v || typeof v !== 'object') return false;
    const o = v as Record<string, unknown>;
    return isString(o.link) && isString(o.memo) && (o.video === null || isVideo(o.video));
}

/** Whether a stored value is a whole draft (storage can hold anything, e.g. from an older version). */
function isDraft(v: unknown): v is Draft {
    if (!v || typeof v !== 'object') return false;
    const o = v as Record<string, unknown>;
    return (
        isString(o.id) &&
        typeof o.updatedAt === 'number' &&
        isString(o.title) &&
        isString(o.scenario) &&
        isString(o.writer) &&
        VISIBILITY_OPTIONS.includes(o.visibility as Visibility) &&
        typeof o.anonymous === 'boolean' &&
        Array.isArray(o.tracks) &&
        o.tracks.every(isTrack)
    );
}

/** Drafts in a stored value (whatever is malformed is left out), in storage order. */
function parse(raw: string | null): Draft[] {
    try {
        const parsed: unknown = JSON.parse(raw ?? '[]');
        return Array.isArray(parsed) ? parsed.filter(isDraft) : [];
    } catch {
        return [];
    }
}

function read(storage: Storage, owner: string): Draft[] {
    try {
        return parse(storage.getItem(keyFor(owner)));
    } catch {
        return [];
    }
}

/** The drafts in a stored value that haven't expired, newest first. Reads only; see listDrafts. */
export const parseDrafts = (raw: string | null, now: number) =>
    parse(raw)
        .filter((d) => fresh(d, now))
        .sort(newestFirst);

/** Writes the list (or removes the key when it's empty). False if the browser refused. */
function write(storage: Storage, owner: string, drafts: Draft[]) {
    try {
        if (drafts.length === 0) storage.removeItem(keyFor(owner));
        else storage.setItem(keyFor(owner), JSON.stringify(drafts));
        return true;
    } catch {
        return false;
    }
}

const fresh = (d: Draft, now: number) => now - d.updatedAt < DRAFT_TTL_MS;
const newestFirst = (a: Draft, b: Draft) => b.updatedAt - a.updatedAt;

/** The account's drafts, newest first. Drafts past their 30 days are deleted on the way. */
export function listDrafts(storage: Storage, owner: string, now = Date.now()): Draft[] {
    const all = read(storage, owner);
    const kept = all.filter((d) => fresh(d, now));
    if (kept.length !== all.length) write(storage, owner, kept);
    return kept.sort(newestFirst);
}

/** Whether there is anything worth keeping: a title, scenario, writer or song. */
export const isEmptyDraft = (c: DraftContent) =>
    !c.title.trim() && !c.scenario.trim() && !c.writer.trim() && c.tracks.length === 0;

/**
 * Saves `content` as draft `id` (replacing it), or as a new draft when `id` is null or no longer
 * there. A new draft is refused once the account has MAX_DRAFTS.
 */
export function saveDraft(
    storage: Storage,
    owner: string,
    id: string | null,
    content: DraftContent,
    now = Date.now(),
    newId: () => string = () => crypto.randomUUID(),
): SaveResult {
    if (isEmptyDraft(content)) return { ok: false, reason: 'empty' };
    const drafts = listDrafts(storage, owner, now);
    const existing = id ? drafts.findIndex((d) => d.id === id) : -1;
    if (existing < 0 && drafts.length >= MAX_DRAFTS) return { ok: false, reason: 'full' };
    const draft: Draft = { ...content, id: existing >= 0 ? id! : newId(), updatedAt: now };
    if (existing >= 0) drafts[existing] = draft;
    else drafts.push(draft);
    return write(storage, owner, drafts) ? { ok: true, id: draft.id } : { ok: false, reason: 'storage' };
}

export function deleteDraft(storage: Storage, owner: string, id: string, now = Date.now()) {
    write(
        storage,
        owner,
        listDrafts(storage, owner, now).filter((d) => d.id !== id),
    );
}
