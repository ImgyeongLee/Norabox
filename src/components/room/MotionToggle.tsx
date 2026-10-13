'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useI18n } from '@/i18n/client';
import { MOTION_COOKIE } from '@/lib/room-themes';

/**
 * Per-browser switch for the room theme's moving background. Off brings back the still
 * background (and the blurred cards); remembered for a year in a cookie the room page reads.
 */
export function MotionToggle({ on }: { on: boolean }) {
    const { t } = useI18n();
    const router = useRouter();
    const [pending, startTransition] = useTransition();

    function toggle() {
        document.cookie = on
            ? `${MOTION_COOKIE}=off; path=/; max-age=31536000; samesite=lax`
            : `${MOTION_COOKIE}=; path=/; max-age=0; samesite=lax`;
        // Re-render the page with (or without) the backdrop, keeping the room connected.
        startTransition(() => router.refresh());
    }

    return (
        <div className="mt-4 flex items-center gap-3 border-t border-leaf/25 pt-4">
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{t.motion.label}</p>
                <p className="text-xs text-lime/55">{t.motion.hint}</p>
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={t.motion.label}
                onClick={toggle}
                disabled={pending}
                className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-60 ${
                    on ? 'bg-moss' : 'bg-leaf/60'
                }`}>
                <span
                    className={`absolute left-0 top-0.5 size-5 rounded-full bg-pine shadow transition-transform ${
                        on ? 'translate-x-5.5' : 'translate-x-0.5'
                    }`}
                />
            </button>
        </div>
    );
}
