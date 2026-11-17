'use client';

/* eslint-disable @next/next/no-img-element -- YouTube thumbnails */
import { useState } from 'react';
import { LuEyeOff } from 'react-icons/lu';
import { Icon, PlayIcon } from '@/components/icons';
import { useI18n } from '@/i18n/client';

/**
 * Lightweight YouTube embed: shows the thumbnail until clicked, then loads the player.
 * `compact` draws a smaller play button, for small thumbnails. Once playing it is never smaller
 * than 200x200px, YouTube's minimum player size (narrow screens get a letterboxed player).
 * `square` is a fixed 200x200px box, that minimum, from the start.
 * `blurred` (set by the site admin on Explore, for frightening thumbnails): the thumbnail is
 * blurred until the first click, which shows it; the next click plays.
 */
export function YouTubeEmbed({
    videoId,
    title,
    compact = false,
    square = false,
    blurred = false,
}: {
    videoId: string;
    title: string;
    compact?: boolean;
    square?: boolean;
    blurred?: boolean;
}) {
    const { t } = useI18n();
    const [active, setActive] = useState(false);
    const [revealed, setRevealed] = useState(false);
    const hidden = blurred && !revealed;
    return (
        <div
            className={`relative overflow-hidden rounded-xl bg-black ${
                square ? 'size-50 shrink-0' : `aspect-video w-full ${active ? 'min-h-[200px] min-w-[200px]' : ''}`
            }`}>
            {active ? (
                <iframe
                    className="absolute inset-0 size-full"
                    src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1`}
                    title={title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                />
            ) : hidden ? (
                <button onClick={() => setRevealed(true)} className="group absolute inset-0" aria-label={t.embed.reveal(title)}>
                    <img
                        src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
                        alt=""
                        className="size-full scale-125 object-cover opacity-70 blur-2xl"
                    />
                    <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/30 px-3 text-center text-xs font-semibold text-lime">
                        <Icon as={LuEyeOff} className="size-6" />
                        {t.embed.blurred}
                    </span>
                </button>
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
