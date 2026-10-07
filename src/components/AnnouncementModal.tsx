'use client';

import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { LuExternalLink, LuMegaphone } from 'react-icons/lu';
import { Icon } from '@/components/icons';
import { useI18n } from '@/i18n/client';
import { announcement } from '@/lib/announcement';

const HIDE_FOR_MS = 24 * 60 * 60 * 1000;
const hideKey = (id: string) => `norabox:announcement:${id}:hideUntil`; // localStorage: "don't show for 24 hours"
const closedKey = (id: string) => `norabox:announcement:${id}:closed`; // sessionStorage: closed for this visit

/** Whether this browser should see the announcement now (false on the server). */
function shouldShow() {
    if (!announcement || Date.now() >= Date.parse(announcement.showUntil)) return false;
    try {
        if (sessionStorage.getItem(closedKey(announcement.id))) return false;
        return Date.now() >= Number(localStorage.getItem(hideKey(announcement.id)) ?? 0);
    } catch {
        return true;
    }
}

const noopSubscribe = () => () => {};

/** Site announcement pop-up: shown once per visit, or hidden for 24 hours on request. */
export function AnnouncementModal() {
    const { t } = useI18n();
    const titleId = useId();
    const bodyId = useId();
    const dialog = useRef<HTMLDialogElement>(null);
    // Decided in the browser only, so server and first client render agree (no hydration mismatch).
    const eligible = useSyncExternalStore(noopSubscribe, shouldShow, () => false);
    const [dismissed, setDismissed] = useState(false);
    const open = eligible && !dismissed;

    useEffect(() => {
        const d = dialog.current;
        if (open && d && !d.open) d.showModal();
    }, [open]);

    function close(hideForADay: boolean) {
        if (!announcement) return;
        try {
            sessionStorage.setItem(closedKey(announcement.id), '1');
            if (hideForADay) localStorage.setItem(hideKey(announcement.id), String(Date.now() + HIDE_FOR_MS));
        } catch {}
        dialog.current?.close();
        setDismissed(true);
    }

    if (!eligible) return null;

    return (
        <dialog
            ref={dialog}
            aria-labelledby={titleId}
            aria-describedby={bodyId}
            // Esc closes it for this visit.
            onCancel={(e) => {
                e.preventDefault();
                close(false);
            }}
            className="fixed inset-0 m-auto h-fit w-[min(30rem,calc(100%-2rem))] rounded-2xl border border-leaf/60 bg-pine p-0 text-lime shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
        >
            <div className="p-6">
                <div className="flex items-center gap-2 text-moss">
                    <Icon as={LuMegaphone} className="size-5" />
                    <h2 id={titleId} className="text-lg font-bold text-lime">
                        {t.announcement.title}
                    </h2>
                </div>
                <p id={bodyId} className="mt-3 leading-relaxed text-lime/85">
                    {t.announcement.body}
                </p>
                {announcement?.link && (
                    <p className="mt-3 text-sm text-lime/75">
                        {t.announcement.moreInfo}{' '}
                        <a
                            href={announcement.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 break-all font-semibold text-moss underline underline-offset-4 hover:text-lime"
                        >
                            {announcement.link.replace(/^https?:\/\//, '')}
                            <Icon as={LuExternalLink} className="size-3.5 shrink-0" />
                        </a>
                    </p>
                )}
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button type="button" className="btn-ghost" onClick={() => close(true)}>
                        {t.announcement.hide24h}
                    </button>
                    <button type="button" className="btn-primary" autoFocus onClick={() => close(false)}>
                        {t.announcement.close}
                    </button>
                </div>
            </div>
        </dialog>
    );
}
