'use client';

import { useState } from 'react';
import { CreateRoomForm, JoinRoomForm, type ImportingPlaylist } from '@/components/home/RoomForms';
import { ThemeStep } from '@/components/home/ThemeStep';
import { useI18n } from '@/i18n/client';
import type { ThemeOption } from '@/lib/limited-themes';

/**
 * The home page's start: the intro (`hero`, from the server) beside the "start a room" / "join"
 * card, and below them `after`. Once a room name passes step 1, the theme step (with its preview)
 * takes over the whole width instead, until the room is created or the visitor goes back. Both
 * steps happen in this page, so moving between them loads nothing.
 */
export function HomeStart({
    hero,
    after,
    importing,
    themes,
}: {
    hero: React.ReactNode;
    after: React.ReactNode;
    importing: ImportingPlaylist | null;
    themes: ThemeOption[];
}) {
    const { t } = useI18n();
    /** The name that passed step 1 while on step 2, else null. */
    const [themeStepFor, setThemeStepFor] = useState<string | null>(null);
    /** What step 1 shows when coming back: the name, and why it came back (name taken). */
    const [returned, setReturned] = useState<{ name: string; error: string | null }>({ name: '', error: null });

    if (themeStepFor) {
        return (
            <ThemeStep
                name={themeStepFor}
                themes={themes}
                importing={importing}
                onBack={(error) => {
                    setReturned({ name: themeStepFor, error: error ?? null });
                    setThemeStepFor(null);
                }}
            />
        );
    }

    return (
        <>
            <section className="grid items-start gap-10 lg:grid-cols-[1.1fr_1fr]">
                {hero}
                <div id="start-room" className={`card scroll-mt-24 space-y-6 p-5 sm:p-7 ${importing ? 'border-moss/70' : ''}`}>
                    <div>
                        <h2 className="mb-4 text-xl font-bold">{t.home.startRoom}</h2>
                        <CreateRoomForm
                            // A fresh form (name and message) each time step 2 sends the visitor back.
                            key={`${returned.name}:${returned.error ?? ''}`}
                            importing={importing}
                            initialName={returned.name}
                            initialError={returned.error}
                            onNext={(name) => {
                                setThemeStepFor(name);
                                window.scrollTo({ top: 0 });
                            }}
                        />
                    </div>
                    <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-lime/40">
                        <span className="h-px flex-1 bg-leaf/40" /> {t.home.or} <span className="h-px flex-1 bg-leaf/40" />
                    </div>
                    <div>
                        <h2 className="mb-4 text-xl font-bold">{t.home.joinFriend}</h2>
                        <JoinRoomForm />
                    </div>
                </div>
            </section>
            {after}
        </>
    );
}
