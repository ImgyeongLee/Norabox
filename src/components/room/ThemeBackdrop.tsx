import type { RoomTheme } from '@/lib/room-themes';

/**
 * Moving background for room themes that have one (see hasAnimatedBackdrop). It sits behind
 * the page and only animates opacity and transform, which the GPU composites without
 * repainting; the styles (and the "reduce motion" fallback) are in globals.css.
 */
export function ThemeBackdrop({ theme }: { theme: RoomTheme }) {
    const layers =
        theme === 'starry'
            ? ['backdrop-twinkle starry-stars-a', 'backdrop-twinkle starry-stars-b', 'backdrop-twinkle starry-stars-c', 'starry-shooting']
            : theme === 'cosmos'
              ? ['cosmos-nebula', 'backdrop-twinkle cosmos-stars-a', 'backdrop-twinkle cosmos-stars-b']
              : theme === 'candy'
                ? ['candy-hearts candy-hearts-a', 'candy-hearts candy-hearts-b']
                : null;
    if (!layers) return null;
    return (
        <div aria-hidden className={`theme-backdrop theme-backdrop-${theme}`}>
            {layers.map((className) => (
                <div key={className} className={className} />
            ))}
        </div>
    );
}
