'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { LuCheck, LuChevronDown, LuLanguages } from 'react-icons/lu';
import { Icon } from '@/components/icons';
import { LOCALE_COOKIE, LOCALES, type Locale } from '@/i18n/config';
import { useI18n } from '@/i18n/client';

// Each language's own name, so people can find theirs whatever language the page is in.
const LABELS: Record<Locale, string> = { en: 'English', ko: '한국어', ja: '日本語' };

/** Remembers the choice for a year; read by the server on every request. */
function saveLocale(locale: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * Language menu in the header, styled like the user menu. Keyboard: arrows (or Home/End) move
 * through the languages, Enter picks one, Esc closes. The list only renders while open, so pages
 * don't download the other languages' fonts just to draw their names.
 */
export function LanguageSwitcher() {
    const { locale, t } = useI18n();
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

    useEffect(() => {
        if (!open) return;
        // Start on the current language, like a native select.
        itemRefs.current[LOCALES.indexOf(locale)]?.focus();
        const closeOutside = (e: MouseEvent) => {
            if (!ref.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', closeOutside);
        return () => document.removeEventListener('mousedown', closeOutside);
    }, [open, locale]);

    function close(returnFocus: boolean) {
        setOpen(false);
        if (returnFocus) buttonRef.current?.focus();
    }

    function choose(next: Locale) {
        close(true);
        if (next === locale) return;
        saveLocale(next);
        // Re-render server components in the new language without losing client state.
        startTransition(() => router.refresh());
    }

    function onMenuKeyDown(e: React.KeyboardEvent) {
        const items = itemRefs.current.filter((el): el is HTMLButtonElement => !!el);
        const focus = (i: number) => items[(i + items.length) % items.length].focus();
        const current = items.indexOf(document.activeElement as HTMLButtonElement);
        if (e.key === 'ArrowDown') focus(current + 1);
        else if (e.key === 'ArrowUp') focus(current - 1);
        else if (e.key === 'Home') focus(0);
        else if (e.key === 'End') focus(items.length - 1);
        else if (e.key === 'Escape') close(true);
        else if (e.key === 'Tab') return close(false);
        else return;
        e.preventDefault();
    }

    return (
        <div ref={ref} className="relative">
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setOpen((o) => !o)}
                onKeyDown={(e) => {
                    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                        e.preventDefault();
                        setOpen(true);
                    }
                }}
                aria-haspopup="menu"
                aria-expanded={open}
                // On phones only the icon shows, so the label carries the current language.
                aria-label={`${t.nav.language}: ${LABELS[locale]}`}
                className={`flex items-center gap-1.5 rounded-lg border border-leaf/50 px-2 py-1.5 text-xs font-semibold transition hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime/70 ${
                    open ? 'text-lime' : 'text-lime/70'
                } ${pending ? 'opacity-60' : ''}`}
            >
                <Icon as={LuLanguages} className="size-3.5" />
                <span className="hidden sm:inline">{LABELS[locale]}</span>
                <Icon as={LuChevronDown} className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div
                    role="menu"
                    aria-label={t.nav.language}
                    onKeyDown={onMenuKeyDown}
                    className="card absolute right-0 z-50 mt-2 w-36 overflow-hidden bg-pine/95 p-1 shadow-xl"
                >
                    {LOCALES.map((l, i) => (
                        <button
                            key={l}
                            ref={(el) => {
                                itemRefs.current[i] = el;
                            }}
                            type="button"
                            role="menuitemradio"
                            aria-checked={l === locale}
                            lang={l}
                            onClick={() => choose(l)}
                            className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm outline-none hover:bg-fern focus-visible:bg-fern"
                        >
                            {LABELS[l]}
                            {l === locale && <Icon as={LuCheck} className="size-4 text-moss" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
