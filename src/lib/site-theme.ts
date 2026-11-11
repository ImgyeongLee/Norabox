import type { Palette } from "@/lib/room-themes";

// The home page's "don't like the frog colors? press me 5 times" switch: a plain white & black
// look for the whole site, only in this browser, until it's switched back. A room with its own
// theme keeps that theme (its <style> comes later in the page).

/** Set to "1" for PLAIN_THEME_MAX_AGE seconds; the root layout reads it. */
export const PLAIN_THEME_COOKIE = "norabox_plain";
/** 400 days, the longest browsers keep a cookie. Renewed on every visit to the home page. */
export const PLAIN_THEME_MAX_AGE = 60 * 60 * 24 * 400;
export const PLAIN_THEME_CLICKS = 5;

export const PLAIN_PALETTE: Palette = {
  // Not pure white, which glares: a soft paper gray, lighter cards on top, and off-black text.
  pine: "#e7e5e0",
  fern: "#f7f6f3",
  leaf: "#a8a49b",
  moss: "#262626",
  lime: "#262626",
  scheme: "light",
  danger: "#b42335",
  pageBackground: "#e7e5e0",
};

export const isPlainTheme = (cookie: string | undefined) => cookie === "1";

// Seasonal look for the whole site: its palette, falling snow (Snowfall) and a Santa hat on the
// logo. Set SEASON to null to bring the usual green back. The white & black look above still wins,
// and a room with its own theme keeps that theme (and has no snow).
export const SEASON: "christmas" | null = "christmas";

export const CHRISTMAS_PALETTE: Palette = {
  // A snowy night among evergreens: deep green surfaces, gold accents, cream text, and a warm
  // red glow in the background. Red stays out of the accent so it doesn't read as "delete".
  pine: "#0f1f17",
  fern: "#1f3d2c",
  leaf: "#3f6b4c",
  moss: "#e6b84f",
  lime: "#f5efe0",
  danger: "#ff8a80",
  pageBackground: [
    "radial-gradient(1100px 560px at 8% -10%, rgb(200 54 54 / 0.32), transparent 60%)",
    "radial-gradient(900px 500px at 108% 8%, rgb(230 184 79 / 0.14), transparent 60%)",
    "radial-gradient(1400px 420px at 50% 115%, rgb(245 239 224 / 0.1), transparent 70%)",
    "#0f1f17",
  ].join(", "),
};

/** The palette the site uses for this visitor; null for the built-in green (globals.css). */
export const sitePalette = (plain: boolean): Palette | null =>
  plain ? PLAIN_PALETTE : SEASON === "christmas" ? CHRISTMAS_PALETTE : null;

/** Whether the seasonal decorations (snow, logo hat) show for this visitor. */
export const seasonOn = (plain: boolean) => !plain && SEASON !== null;
