import { ROOM_THEMES, type RoomTheme } from '@/lib/room-themes';

// Room themes offered only for a while. Each has an environment variable holding its last moment
// in Korea time, e.g. ROOM_THEME_CYBERPUNK_UNTIL="2026-12-31T23:59". Unset or unreadable: the
// theme is off. Past that moment it leaves the theme picker, new rooms can't take it, and rooms
// that have it look like the default theme. Changing the variable needs a redeploy on Vercel.

/** Limited themes and the variable that sets each one's deadline. */
export const LIMITED_THEMES: Partial<Record<RoomTheme, string>> = {
    cyberpunk: 'ROOM_THEME_CYBERPUNK_UNTIL',
    garden: 'ROOM_THEME_GARDEN_UNTIL',
};

type Env = Record<string, string | undefined>;

/**
 * A deadline from its variable: "YYYY-MM-DDTHH:mm" (or with seconds) in Korea time. A value with
 * its own offset or Z is taken as is. Null when it can't be read.
 */
export function parseKstDeadline(raw: string | undefined): Date | null {
    const value = raw?.trim();
    if (!value) return null;
    const withZone = /([zZ]|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}+09:00`;
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?([zZ]|[+-]\d{2}:\d{2})$/.test(withZone)) return null;
    const at = new Date(withZone);
    return Number.isNaN(at.getTime()) ? null : at;
}

/** The theme's deadline, or null for a theme that isn't limited (or whose variable is unset). */
export function themeDeadline(theme: RoomTheme, env: Env = process.env): Date | null {
    const name = LIMITED_THEMES[theme];
    return name ? parseKstDeadline(env[name]) : null;
}

/** Whether the theme can be used now: always for regular themes, before the deadline for limited ones. */
export function isThemeOpen(theme: RoomTheme, now = new Date(), env: Env = process.env): boolean {
    if (!LIMITED_THEMES[theme]) return true;
    const deadline = themeDeadline(theme, env);
    return !!deadline && now < deadline;
}

/** The theme a room shows: its own, or the default once a limited one has ended. */
export const shownTheme = (theme: RoomTheme, now = new Date(), env: Env = process.env): RoomTheme =>
    isThemeOpen(theme, now, env) ? theme : 'default';

/** A theme the picker offers; `until` (ISO) is set for limited ones. */
export type ThemeOption = { id: RoomTheme; until: string | null };

/** The themes to offer now, in order. */
export function themeOptions(now = new Date(), env: Env = process.env): ThemeOption[] {
    return ROOM_THEMES.filter((id) => isThemeOpen(id, now, env)).map((id) => ({
        id,
        until: themeDeadline(id, env)?.toISOString() ?? null,
    }));
}
