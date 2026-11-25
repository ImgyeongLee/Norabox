import { Chakra_Petch, Cinzel, Gowun_Batang, Orbitron } from 'next/font/google';
import type { RoomTheme } from '@/lib/room-themes';

// Fonts of the skinned room themes (globals.css: --font-cyber-*, --font-garden-*), shared by the
// room page and the theme preview on the home page. Not preloaded: Next.js serves them from this
// site, and a browser downloads one only when text in it is on screen, i.e. in a room (or a
// preview) with that theme.

const cyberDisplay = Orbitron({
    subsets: ['latin'],
    weight: ['700', '800'],
    variable: '--font-cyber-display',
    preload: false,
    display: 'swap',
});
const cyberLabel = Chakra_Petch({
    subsets: ['latin'],
    weight: ['600'],
    variable: '--font-cyber-label',
    preload: false,
    display: 'swap',
});
// Classical capitals for the room code, a Korean serif for song titles.
const gardenDisplay = Cinzel({
    subsets: ['latin'],
    weight: ['700'],
    variable: '--font-garden-display',
    preload: false,
    display: 'swap',
});
const gardenSerif = Gowun_Batang({
    weight: ['700'],
    variable: '--font-garden-serif',
    preload: false,
    display: 'swap',
});

/** Class names that define a skinned theme's font variables, for the element carrying its skin. */
export const SKIN_FONTS: Partial<Record<RoomTheme, string>> = {
    cyberpunk: `${cyberDisplay.variable} ${cyberLabel.variable}`,
    garden: `${gardenDisplay.variable} ${gardenSerif.variable}`,
};
