'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { LOCALE_COOKIE, LOCALES, type Locale } from '@/i18n/config';
import { useI18n } from '@/i18n/client';

const LABELS: Record<Locale, string> = { en: 'EN', ko: '한국어' };

/** Remembers the choice for a year; read by the server on every request. */
function saveLocale(locale: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

export function LanguageSwitcher() {
    const { locale, t } = useI18n();
    const router = useRouter();
    const [pending, startTransition] = useTransition();

    function choose(next: Locale) {
        if (next === locale) return;
        saveLocale(next);
        // Re-render server components in the new language without losing client state.
        startTransition(() => router.refresh());
    }

    return (
        <div
            role="group"
            aria-label={t.nav.language}
            className={`flex rounded-lg border border-leaf/50 p-0.5 text-xs font-semibold ${pending ? 'opacity-60' : ''}`}
        >
            {LOCALES.map((l) => (
                <button
                    key={l}
                    type="button"
                    lang={l}
                    aria-pressed={l === locale}
                    onClick={() => choose(l)}
                    className={`rounded-md px-2 py-1 transition ${
                        l === locale ? 'bg-moss text-pine' : 'text-lime/65 hover:text-lime'
                    }`}
                >
                    {LABELS[l]}
                </button>
            ))}
        </div>
    );
}
