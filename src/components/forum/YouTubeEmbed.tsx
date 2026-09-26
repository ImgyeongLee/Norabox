'use client';

/* eslint-disable @next/next/no-img-element -- YouTube thumbnails */
import { useState } from 'react';
import { PlayIcon } from '@/components/icons';

/** Lightweight YouTube embed: shows the thumbnail until clicked, then loads the player. */
export function YouTubeEmbed({ videoId, title }: { videoId: string; title: string }) {
    const [active, setActive] = useState(false);
    return (
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
            {active ? (
                <iframe
                    className="absolute inset-0 size-full"
                    src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1`}
                    title={title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                />
            ) : (
                <button onClick={() => setActive(true)} className="group absolute inset-0" aria-label={`Play ${title}`}>
                    <img
                        src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
                        alt=""
                        className="size-full object-cover opacity-90 transition group-hover:opacity-100"
                    />
                    <span className="absolute inset-0 flex items-center justify-center">
                        <span className="flex size-16 items-center justify-center rounded-full bg-moss text-pine shadow-xl transition group-hover:scale-110 group-hover:bg-lime">
                            <PlayIcon className="size-7 translate-x-0.5" />
                        </span>
                    </span>
                </button>
            )}
        </div>
    );
}
