'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useI18n } from '@/i18n/client';
import { PLAIN_THEME_CLICKS, PLAIN_THEME_COOKIE, PLAIN_THEME_MAX_AGE } from '@/lib/site-theme';

/**
 * Under the home page's lead: pressed PLAIN_THEME_CLICKS times, it turns the whole site white & black
 * for this browser for a day (a cookie the root layout reads). Another PLAIN_THEME_CLICKS presses bring the frog back.
 */
export function PlainThemeButton({ on }: { on: boolean }) {
    const { t } = useI18n();
    const router = useRouter();
    const [clicks, setClicks] = useState(0);
    const [pending, startTransition] = useTransition();

    function press() {
        if (clicks + 1 < PLAIN_THEME_CLICKS) return setClicks(clicks + 1);
        document.cookie = on
            ? `${PLAIN_THEME_COOKIE}=; path=/; max-age=0; samesite=lax`
            : `${PLAIN_THEME_COOKIE}=1; path=/; max-age=${PLAIN_THEME_MAX_AGE}; samesite=lax`;
        setClicks(0);
        // Re-render the layout so its theme <style> changes.
        startTransition(() => router.refresh());
    }

    return (
        <button
            type="button"
            onClick={press}
            disabled={pending}
            className="mt-3 text-left text-sm text-lime/45 underline-offset-4 transition hover:text-lime/80 hover:underline"
        >
            {on ? t.home.plainTheme.back : t.home.plainTheme.offer}
            {clicks > 0 && (
                <span aria-live="polite" className="ml-1.5 font-semibold text-moss">
                    {t.home.plainTheme.progress(clicks, PLAIN_THEME_CLICKS)}
                </span>
            )}
        </button>
    );
}
