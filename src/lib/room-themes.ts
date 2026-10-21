// Room color themes. The room owner picks one when creating the room; everyone in
// the room sees it. A theme swaps the five palette colors every component uses
// (see @theme in globals.css), plus the page background.

export const ROOM_THEMES = ["default", "mono", "starry", "candy", "cosmos"] as const;
export type RoomTheme = (typeof ROOM_THEMES)[number];

export const isRoomTheme = (v: unknown): v is RoomTheme => ROOM_THEMES.includes(v as RoomTheme);

/** Themes with a moving background (src/components/room/ThemeBackdrop.tsx). */
const ANIMATED_THEMES: readonly RoomTheme[] = ["starry", "candy", "cosmos"];
export const hasAnimatedBackdrop = (theme: RoomTheme) => ANIMATED_THEMES.includes(theme);

/** Set to "off" when someone turns room background animations off; read by the room page. */
export const MOTION_COOKIE = "norabox_motion";

export type Palette = {
  /** Page background (darkest). */
  pine: string;
  /** Cards and surfaces. */
  fern: string;
  /** Borders and secondary buttons. */
  leaf: string;
  /** Accent: primary buttons, links, highlights. */
  moss: string;
  /** Text. */
  lime: string;
  /** Full `background` value for the page. */
  pageBackground: string;
  /** "light" for themes with a light background (form controls, scrollbars). Default "dark". */
  scheme?: "light" | "dark";
  /** Red for errors and delete buttons, when the default coral doesn't contrast enough. */
  danger?: string;
};

export const THEME_PALETTES: Record<RoomTheme, Palette> = {
  default: {
    pine: "#132a13",
    fern: "#31572c",
    leaf: "#4f772d",
    moss: "#90a955",
    lime: "#ecf39e",
    pageBackground:
      "radial-gradient(1200px 600px at 10% -10%, rgb(79 119 45 / 0.35), transparent 60%), radial-gradient(900px 500px at 110% 10%, rgb(144 169 85 / 0.18), transparent 60%), #132a13",
  },
  mono: {
    pine: "#0a0a0a",
    fern: "#262626",
    leaf: "#525252",
    moss: "#e5e5e5",
    lime: "#fafafa",
    pageBackground:
      "radial-gradient(1200px 600px at 10% -10%, rgb(255 255 255 / 0.08), transparent 60%), radial-gradient(900px 500px at 110% 10%, rgb(255 255 255 / 0.05), transparent 60%), #0a0a0a",
  },
  starry: {
    // A calm night sky: low-saturation navy, warm moonlight text, gold only as the accent.
    // (Derived from #041463 / #0d024f / #e5b902 / #f9de3f, toned down because bright
    // yellow text on saturated indigo strained the eyes.)
    pine: "#0f1530",
    fern: "#1a2347",
    leaf: "#33406e",
    moss: "#e0bf5a",
    lime: "#ece6d6",
    pageBackground: [
      // A few dim stars, a faint warm glow, then the night sky.
      "radial-gradient(1.5px 1.5px at 12% 18%, rgb(236 230 214 / 0.45), transparent)",
      "radial-gradient(1px 1px at 28% 72%, rgb(236 230 214 / 0.35), transparent)",
      "radial-gradient(1px 1px at 47% 33%, rgb(236 230 214 / 0.4), transparent)",
      "radial-gradient(1.5px 1.5px at 78% 58%, rgb(224 191 90 / 0.35), transparent)",
      "radial-gradient(1px 1px at 88% 26%, rgb(236 230 214 / 0.35), transparent)",
      "radial-gradient(1px 1px at 35% 90%, rgb(236 230 214 / 0.3), transparent)",
      "radial-gradient(1000px 520px at 85% -10%, rgb(224 191 90 / 0.07), transparent 60%)",
      "radial-gradient(1100px 600px at 0% 110%, rgb(26 35 71 / 0.8), transparent 70%)",
      "#0f1530",
    ].join(", "),
  },
  // Shown as "Pink Couple"; the id stays "candy" so rooms already using it keep working.
  candy: {
    // Cute and light: pink is the main color, butter yellow tints the cards, bright green
    // draws the borders, and yellow + green polka dots float in the background.
    // Text and buttons keep at least 4.5:1 contrast so it stays easy to read.
    pine: "#fff0f6",
    fern: "#ffe169",
    leaf: "#5cc93a",
    moss: "#d0216f",
    lime: "#5b2140",
    scheme: "light",
    danger: "#c81e3a",
    pageBackground: [
      // Polka dots: yellow on one grid, green on an offset grid.
      "radial-gradient(circle, rgb(255 205 40 / 0.45) 2.5px, transparent 3px) 0 0 / 44px 44px",
      "radial-gradient(circle, rgb(92 201 58 / 0.35) 2px, transparent 2.5px) 22px 22px / 44px 44px",
      // Soft pink and yellow glows.
      "radial-gradient(1100px 560px at 10% -10%, rgb(255 143 186 / 0.35), transparent 60%)",
      "radial-gradient(900px 500px at 110% 10%, rgb(255 225 105 / 0.3), transparent 60%)",
      "#fff0f6",
    ].join(", "),
  },
  cosmos: {
    // Black, light green, red and yellow, tuned to be easy on the eyes: a soft near-black
    // (not #000), pale low-saturation green text (~16:1), a calm, lower-saturation red
    // accent (~6:1; saturated reds glare on dark backgrounds), and yellow kept for
    // subtle borders and a few small stars. Errors use orange, so they don't look like
    // the red buttons and links.
    pine: "#0e0e14",
    fern: "#1a1a24",
    leaf: "#7a6a34",
    moss: "#d77575",
    lime: "#d9f0d9",
    danger: "#f5a05a",
    pageBackground: [
      // A few small stars (soft yellow and white), faint red and green nebulae, then deep space.
      "radial-gradient(1.5px 1.5px at 14% 22%, rgb(243 215 122 / 0.55), transparent)",
      "radial-gradient(1px 1px at 31% 68%, rgb(217 240 217 / 0.4), transparent)",
      "radial-gradient(1px 1px at 52% 16%, rgb(243 215 122 / 0.45), transparent)",
      "radial-gradient(1.5px 1.5px at 71% 44%, rgb(217 240 217 / 0.35), transparent)",
      "radial-gradient(1px 1px at 86% 78%, rgb(243 215 122 / 0.4), transparent)",
      "radial-gradient(1px 1px at 9% 88%, rgb(215 117 117 / 0.4), transparent)",
      "radial-gradient(1000px 560px at 90% -10%, rgb(215 117 117 / 0.07), transparent 60%)",
      "radial-gradient(900px 520px at -5% 105%, rgb(217 240 217 / 0.05), transparent 60%)",
      "#0e0e14",
    ].join(", "),
  },
};

/** CSS that applies a theme to the whole page (used inside a <style> tag). */
export function themeCss(theme: RoomTheme) {
  return paletteCss(THEME_PALETTES[theme]);
}

export function paletteCss(p: Palette) {
  const danger = p.danger ? `--color-danger:${p.danger};` : "";
  return `:root{color-scheme:${p.scheme ?? "dark"};--color-pine:${p.pine};--color-fern:${p.fern};--color-leaf:${p.leaf};--color-moss:${p.moss};--color-lime:${p.lime};${danger}--page-bg:${p.pageBackground};}`;
}
