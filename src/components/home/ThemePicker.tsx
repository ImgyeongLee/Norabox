'use client';

import { useI18n } from '@/i18n/client';
import { ROOM_THEMES, THEME_PALETTES, type RoomTheme } from '@/lib/room-themes';

/**
 * Compact room-theme picker: one row of round swatches. Each swatch shows four of
 * the theme's colors in quarters; the selected theme's name sits next to the label.
 */
export function ThemePicker({ value, onChange }: { value: RoomTheme; onChange: (theme: RoomTheme) => void }) {
    const { t } = useI18n();
    return (
        <fieldset className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
            <legend className="sr-only">{t.roomForms.theme}</legend>
            <span aria-hidden className="text-sm font-medium text-lime/85">
                {t.roomForms.theme}
            </span>
            <div className="flex items-center gap-2">
                {ROOM_THEMES.map((id) => {
                    const p = THEME_PALETTES[id];
                    const selected = value === id;
                    return (
                        <label
                            key={id}
                            title={`${t.roomForms.themes[id]} · ${t.roomForms.themeHint}`}
                            className={`relative size-8 cursor-pointer rounded-full transition ${
                                selected
                                    ? 'ring-2 ring-moss ring-offset-2 ring-offset-pine'
                                    : 'ring-1 ring-leaf/50 hover:scale-110'
                            }`}
                            style={{
                                // The theme's own colors, whatever theme the page is in.
                                background: `conic-gradient(${p.pine} 0 25%, ${p.fern} 0 50%, ${p.leaf} 0 75%, ${p.moss} 0)`,
                            }}>
                            <input
                                type="radio"
                                name="room-theme"
                                value={id}
                                checked={selected}
                                onChange={() => onChange(id)}
                                aria-label={t.roomForms.themes[id]}
                                className="peer sr-only"
                            />
                            {/* Keyboard focus ring (the input itself is hidden). */}
                            <span className="pointer-events-none absolute -inset-1 rounded-full peer-focus-visible:ring-2 peer-focus-visible:ring-lime/70" />
                        </label>
                    );
                })}
            </div>
            <span className="text-xs font-semibold text-moss" aria-live="polite">
                {t.roomForms.themes[value]}
            </span>
        </fieldset>
    );
}
