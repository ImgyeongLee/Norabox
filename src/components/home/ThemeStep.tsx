'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LuArrowLeft } from 'react-icons/lu';
import { Icon } from '@/components/icons';
import { RoomPreview } from '@/components/home/RoomPreview';
import type { ImportingPlaylist } from '@/components/home/RoomForms';
import { useI18n } from '@/i18n/client';
import { getClientId } from '@/lib/client-identity';
import { formatKst } from '@/lib/format';
import type { ThemeOption } from '@/lib/limited-themes';
import { THEME_PALETTES, THEME_VARIANT_OF, type RoomTheme } from '@/lib/room-themes';

/**
 * Step 2 of starting a room: pick its theme while a preview of the room shows it, then create
 * the room. Desktop: preview on the left, theme cards on the right (regular themes, then the
 * limited-time ones with their end dates). Phones: preview, a sideways-scrolling row of themes
 * (limited ones first), the chosen theme's description, and the create button held at the bottom.
 * A theme with variants (Black & white / White & black) has one card, and while it is chosen a
 * switch between the variants shows (THEME_VARIANT_OF).
 */
export function ThemeStep({
    name,
    themes,
    importing,
    onBack,
}: {
    /** The room name from step 1 (already checked to be free). */
    name: string;
    themes: ThemeOption[];
    importing?: ImportingPlaylist | null;
    /** Back to step 1, with `error` when the name turned out to be taken after all. */
    onBack: (error?: string) => void;
}) {
    const router = useRouter();
    const { t, tError, locale } = useI18n();
    const [theme, setTheme] = useState<RoomTheme>('default');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    /** The card a theme belongs to: its own, or the one it is a variant of. */
    const familyOf = (id: RoomTheme) => THEME_VARIANT_OF[id] ?? id;
    const cards = themes.filter((o) => !THEME_VARIANT_OF[o.id]);
    const regular = cards.filter((o) => !o.until);
    const limited = cards.filter((o) => o.until);
    const variants = themes.filter((o) => familyOf(o.id) === familyOf(theme));
    const untilLabel = (until: string | null) => (until ? t.roomForms.until(formatKst(new Date(until), locale)) : null);
    const chosen = themes.find((o) => o.id === theme) ?? themes[0];

    async function create() {
        setBusy(true);
        setError(null);
        try {
            const res = await fetch('/api/rooms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    clientId: getClientId(),
                    theme,
                    ...(importing ? { importPostId: importing.id } : {}),
                    ...(importing?.shareToken ? { importShareToken: importing.shareToken } : {}),
                }),
            });
            const data = await res.json();
            if (res.ok) return router.push(`/room/${data.code}`);
            // Someone took the name since step 1: pick another one there.
            if (data.error === 'roomNameTaken') return onBack(tError('roomNameTaken'));
            throw new Error(data.error ?? 'createRoomFailed');
        } catch (err) {
            setError(tError(err instanceof Error ? err.message : 'createRoomFailed'));
            setBusy(false);
        }
    }

    const card = (o: ThemeOption, layout: 'row' | 'chip') => {
        const selected = familyOf(theme) === o.id;
        // The chosen variant shows on its family's card.
        const shown = selected ? theme : o.id;
        const p = THEME_PALETTES[shown];
        return (
            <button
                key={o.id}
                type="button"
                aria-pressed={selected}
                onClick={() => !selected && setTheme(o.id)}
                className={`relative flex rounded-xl border text-left transition hover:bg-moss/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime/70 ${
                    selected ? 'border-2 border-moss bg-moss/15' : 'border-leaf/60 bg-pine/35'
                } ${
                    layout === 'chip'
                        ? 'min-h-22 w-26 shrink-0 snap-start flex-col items-center justify-center gap-1.5 px-1.5 py-2 text-center'
                        : 'min-h-16 w-full items-center gap-2.5 px-3 py-2.5'
                }`}>
                {layout === 'chip' && o.until && (
                    <span className="absolute right-1.5 top-1.5 rounded-full bg-moss px-1.5 text-[9px] font-extrabold text-pine">
                        {t.roomForms.limitedShort}
                    </span>
                )}
                <span
                    aria-hidden
                    className="size-8 shrink-0 rounded-full ring-1 ring-white/15"
                    style={{ background: `conic-gradient(${p.pine} 0 25%, ${p.fern} 0 50%, ${p.leaf} 0 75%, ${p.moss} 0)` }}
                />
                {layout === 'chip' ? (
                    <span className="text-[13px] font-bold leading-tight">{t.roomForms.themes[shown]}</span>
                ) : (
                    <span className="min-w-0">
                        <span className="block text-sm font-bold">{t.roomForms.themes[shown]}</span>
                        <span className="block truncate text-xs text-lime/70">{t.roomForms.themeMoods[shown]}</span>
                        {o.until && <span className="mt-0.5 block text-[11px] text-moss">{untilLabel(o.until)}</span>}
                    </span>
                )}
            </button>
        );
    };

    // Switch between the chosen theme's variants (only when it has some).
    const variantSwitch =
        variants.length > 1 ? (
            <div role="radiogroup" aria-label={t.roomForms.variant} className="inline-flex rounded-xl border border-leaf/60 bg-pine/40 p-1">
                {variants.map((o) => {
                    const p = THEME_PALETTES[o.id];
                    const on = o.id === theme;
                    return (
                        <button
                            key={o.id}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            onClick={() => setTheme(o.id)}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime/70 ${
                                on ? 'bg-moss text-pine' : 'text-lime/75 hover:bg-fern/60'
                            }`}>
                            <span aria-hidden className="size-3 rounded-full ring-1 ring-white/25" style={{ background: p.pine }} />
                            {t.roomForms.themes[o.id]}
                        </button>
                    );
                })}
            </div>
        ) : null;

    const createButton = (
        <button type="button" onClick={create} disabled={busy} className="btn-primary w-full py-3 text-base">
            {busy ? (
                t.roomForms.creating
            ) : (
                t.roomForms.createWith(name)
            )}
        </button>
    );

    return (
        // The home page's top padding suits its big intro; pulled up here so the theme step starts
        // about as high as a regular page.
        <section className="-mt-6 space-y-4 sm:-mt-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <button type="button" onClick={() => onBack()} className="btn-ghost -ml-3 px-3">
                    <Icon as={LuArrowLeft} className="size-4" />
                    {t.roomForms.changeName}
                </button>
                <span className="text-sm text-lime/70">
                    <b className="text-moss">2</b> / 2 · {t.roomForms.stepTheme}
                </span>
            </div>

            <div>
                <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                    {t.roomForms.pickTitle(name)}
                </h1>
                <p className="mt-2 muted">{t.roomForms.pickLead}</p>
                {importing && (
                    <p className="mt-2 text-sm text-lime/80">
                        <span className="font-semibold text-moss">{t.home.importing}</span> · {importing.title}
                    </p>
                )}
            </div>

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <div className="space-y-2">
                    <RoomPreview theme={theme} code={name} />
                    <p className="text-xs text-lime/60">{t.roomForms.previewNote}</p>
                </div>

                {/* Phones and tablets: one sideways-scrolling row (limited themes first), then the choice. */}
                <div className="space-y-3 lg:hidden">
                    <div role="group" aria-label={t.roomForms.theme} className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
                        {[...limited, ...regular].map((o) => card(o, 'chip'))}
                    </div>
                    <div className="card space-y-0.5 px-4 py-3">
                        {variantSwitch && <div className="mb-2">{variantSwitch}</div>}
                        <p className="font-extrabold">{t.roomForms.themes[chosen.id]}</p>
                        <p className="text-sm text-lime/75">{t.roomForms.themeMoods[chosen.id]}</p>
                        {chosen.until && (
                            <p className="text-xs text-moss">
                                {t.roomForms.limited} · {untilLabel(chosen.until)}
                            </p>
                        )}
                    </div>
                    {error && <p className="field-error">{error}</p>}
                    {/* Held at the bottom of the screen while the themes scroll by. */}
                    <div className="sticky bottom-0 -mx-4 bg-gradient-to-t from-pine from-70% to-transparent px-4 pb-5 pt-3">
                        {createButton}
                    </div>
                </div>

                {/* Desktop: the theme cards beside the preview. */}
                <div className="card hidden space-y-4 p-5 lg:block">
                    <div role="group" aria-label={t.roomForms.theme} className="grid grid-cols-2 gap-2">
                        {regular.map((o) => card(o, 'row'))}
                    </div>
                    {variantSwitch}
                    {limited.length > 0 && (
                        <>
                            <div className="flex items-center gap-2 border-t border-leaf/45 pt-3">
                                <span className="rounded-full bg-moss px-2 py-0.5 text-[11px] font-extrabold text-pine">
                                    {t.roomForms.limited}
                                </span>
                                <span className="text-xs text-lime/70">{t.roomForms.limitedHint}</span>
                            </div>
                            <div role="group" aria-label={t.roomForms.limited} className="grid grid-cols-2 gap-2">
                                {limited.map((o) => card(o, 'row'))}
                            </div>
                        </>
                    )}
                    <div className="space-y-2 border-t border-leaf/45 pt-4">
                        {createButton}
                        {error && <p className="field-error text-center">{error}</p>}
                        <p className="text-center text-xs text-lime/70">
                            {t.roomForms.chosenTheme(t.roomForms.themes[chosen.id])}
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
