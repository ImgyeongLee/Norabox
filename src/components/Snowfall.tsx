/**
 * Snow falling behind every page while the Christmas look is on (SEASON in src/lib/site-theme.ts).
 * Like the room backdrops it only animates transform, and stands still for "reduce motion"; the
 * styles are in globals.css.
 */
export function Snowfall() {
    return (
        <div aria-hidden className="theme-backdrop snowfall">
            <div className="snow-far" />
            <div className="snow-near" />
        </div>
    );
}
