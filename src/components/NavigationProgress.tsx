'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

// Navigations quicker than this finish before the bar shows (it waits as long; see .nav-progress).
const SHOW_AFTER_MS = 120;
// Gives up if a navigation never lands (an error page, a cancelled click).
const GIVE_UP_MS = 15_000;

/** Whether this click starts a navigation inside the site, which Next.js does without a page load. */
function isSiteNavigation(e: MouseEvent) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
    const a = e.target instanceof Element ? e.target.closest('a[href]') : null;
    if (!(a instanceof HTMLAnchorElement) || (a.target && a.target !== '_self') || a.hasAttribute('download')) {
        return false;
    }
    const url = new URL(a.href, location.href);
    // Another site, or the same page (maybe another #hash): nothing to wait for.
    return url.origin === location.origin && (url.pathname !== location.pathname || url.search !== location.search);
}

/**
 * A thin bar along the top of the window while the next page renders on the server. The current
 * page stays in place until then (and the new one fades in, see template.tsx). Driven straight
 * through the DOM (`data-state`, styled in globals.css), so it never re-renders the page.
 */
export function NavigationProgress() {
    const pathname = usePathname();
    const search = useSearchParams().toString();
    const bar = useRef<HTMLDivElement>(null);
    const startedAt = useRef(0);
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

    const setState = (state: 'idle' | 'loading' | 'done') => {
        if (bar.current) bar.current.dataset.state = state;
    };

    useEffect(() => {
        function onClick(e: MouseEvent) {
            if (!isSiteNavigation(e)) return;
            startedAt.current = Date.now();
            setState('loading');
            clearTimeout(timer.current);
            timer.current = setTimeout(() => setState('idle'), GIVE_UP_MS);
        }
        // Capture phase: before Next's <Link> handles (and cancels) the click.
        document.addEventListener('click', onClick, true);
        return () => {
            document.removeEventListener('click', onClick, true);
            clearTimeout(timer.current);
        };
    }, []);

    // The new page is in: run the bar to the end and fade it out (or skip it if it never showed).
    useEffect(() => {
        if (bar.current?.dataset.state !== 'loading') return;
        clearTimeout(timer.current);
        if (Date.now() - startedAt.current < SHOW_AFTER_MS) return setState('idle');
        setState('done');
        timer.current = setTimeout(() => setState('idle'), 500);
    }, [pathname, search]);

    return <div ref={bar} data-state="idle" className="nav-progress" aria-hidden />;
}
