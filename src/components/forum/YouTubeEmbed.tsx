'use client';

/* eslint-disable @next/next/no-img-element -- YouTube thumbnails */
import { useState } from 'react';
import { PlayIcon } from '@/components/icons';
import { useI18n } from '@/i18n/client';

/**
 * Lightweight YouTube embed: shows the thumbnail until clicked, then loads the player.
 * `compact` draws a smaller play button, for small thumbnails. Once playing it is never smaller
 * than 200x200px, YouTube's minimum player size (narrow screens get a letterboxed player).
 */
export function YouTubeEmbed({ videoId, title, compact = false }: { videoId: string; title: string; compact?: boolean }) {
    const { t } = useI18n();
    const [active, setActive] = useState(false);
    return (
        <div
            className={`relative aspect-video w-full overflow-hidden rounded-xl bg-black ${
                active ? 'min-h-[200px] min-w-[200px]' : ''
            }`}>
            {active ? (
                <iframe
                    className="absolute inset-0 size-full"
                    src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1`}
                    title={title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                />
            ) : (
                <button onClick={() => setActive(true)} className="group absolute inset-0" aria-label={t.embed.play(title)}>
                    <img
                        src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
                        alt=""
                        className="size-full object-cover opacity-90 transition group-hover:opacity-100"
                    />
                    <span className="absolute inset-0 flex items-center justify-center">
                        <span
                            className={`flex items-center justify-center rounded-full bg-moss text-pine shadow-xl transition group-hover:scale-110 group-hover:bg-lime ${
                                compact ? 'size-10' : 'size-16'
                            }`}>
                            <PlayIcon className={`translate-x-0.5 ${compact ? 'size-4' : 'size-7'}`} />
                        </span>
                    </span>
                </button>
            )}
        </div>
    );
}
