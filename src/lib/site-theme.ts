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
