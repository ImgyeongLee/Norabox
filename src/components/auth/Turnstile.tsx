'use client';

import { useEffect, useRef } from 'react';
import { useI18n } from '@/i18n/client';

// Cloudflare Turnstile bot check (server side: src/lib/turnstile.ts). Inside a <form>, the widget
// adds a hidden "cf-turnstile-response" field with a one-time token, so the form sends it along.

type TurnstileApi = {
    render: (el: HTMLElement, options: Record<string, unknown>) => string;
    reset: (id: string) => void;
    remove: (id: string) => void;
};
declare global {
    interface Window {
        turnstile?: TurnstileApi;
    }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let loading: Promise<TurnstileApi> | null = null;

/** Loads Cloudflare's script once, only on pages that show the widget. */
function loadTurnstile() {
    loading ??= new Promise<TurnstileApi>((resolve, reject) => {
        if (window.turnstile) return resolve(window.turnstile);
        const script = document.createElement('script');
        script.src = SCRIPT;
        script.async = true;
        script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile')));
        script.onerror = () => {
            loading = null;
            reject(new Error('turnstile'));
        };
        document.head.appendChild(script);
    });
    return loading;
}

/**
 * The widget; renders nothing when NEXT_PUBLIC_TURNSTILE_SITE_KEY isn't set (local dev).
 * Change `resetKey` after a failed submit: tokens work only once, so it fetches a new one.
 */
export function Turnstile({ resetKey }: { resetKey: number }) {
    const { locale } = useI18n();
    const box = useRef<HTMLDivElement>(null);
    const widget = useRef<{ api: TurnstileApi; id: string } | null>(null);

    useEffect(() => {
        if (!SITE_KEY || !box.current) return;
        let gone = false;
        loadTurnstile()
            .then((api) => {
                if (gone || !box.current) return;
                const id = api.render(box.current, { sitekey: SITE_KEY, theme: 'dark', size: 'flexible', language: locale });
                widget.current = { api, id };
            })
            .catch(() => {}); // Blocked or offline: the server then answers "complete the check".
        return () => {
            gone = true;
            if (widget.current) widget.current.api.remove(widget.current.id);
            widget.current = null;
        };
    }, [locale]);

    useEffect(() => {
        if (resetKey > 0 && widget.current) widget.current.api.reset(widget.current.id);
    }, [resetKey]);

    if (!SITE_KEY) return null;
    // Reserves the widget's height so the form doesn't jump when it appears.
    return <div ref={box} className="min-h-[65px]" />;
}
