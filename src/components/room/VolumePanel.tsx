'use client';

import { useEffect, useRef, useState } from 'react';
import { VolumeIcon } from '@/components/icons';
import { useI18n } from '@/i18n/client';

function Slider({
    label,
    value,
    onChange,
    disabled,
}: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    disabled?: boolean;
}) {
    return (
        <input
            type="range"
            className="slider w-full"
            min={0}
            max={100}
            value={value}
            style={{ '--fill': `${value}%` } as React.CSSProperties}
            onChange={(e) => onChange(Number(e.target.value))}
            disabled={disabled}
            aria-label={label}
        />
    );
}

type Props = {
    personal: number;
    muted: boolean;
    onPersonal: (v: number) => void;
    onToggleMute: () => void;
    master: number;
    isAdmin: boolean;
    onMaster: (v: number) => void;
};

export function VolumePanel({ personal, muted, onPersonal, onToggleMute, master, isAdmin, onMaster }: Props) {
    const { t } = useI18n();
    // Keep the admin's slider responsive while throttling what we send to the server.
    const [localMaster, setLocalMaster] = useState(master);
    const dragging = useRef(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pending = useRef<number | null>(null);

    useEffect(() => {
        if (!dragging.current) setLocalMaster(master);
    }, [master]);

    function changeMaster(v: number) {
        setLocalMaster(v);
        dragging.current = true;
        pending.current = v;
        if (timer.current) return;
        timer.current = setTimeout(() => {
            timer.current = null;
            dragging.current = false;
            if (pending.current != null) onMaster(pending.current);
        }, 120);
    }

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium">{t.volume.mine}</span>
                    <span className="font-mono text-xs text-lime/55">{muted ? t.volume.muted : `${personal}%`}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        className="icon-btn size-8 shrink-0"
                        onClick={onToggleMute}
                        aria-label={muted ? t.volume.unmute : t.volume.mute}>
                        <VolumeIcon muted={muted || personal === 0} />
                    </button>
                    <Slider label={t.volume.mine} value={muted ? 0 : personal} onChange={onPersonal} />
                </div>
                <p className="mt-1 text-xs text-lime/45">{t.volume.mineHint}</p>
            </div>
            <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium">{t.volume.room}</span>
                    <span className="font-mono text-xs text-lime/55">{isAdmin ? localMaster : master}%</span>
                </div>
                <div className="flex h-8 items-center">
                    <Slider
                        label={t.volume.roomLabel}
                        value={isAdmin ? localMaster : master}
                        onChange={changeMaster}
                        disabled={!isAdmin}
                    />
                </div>
                <p className="mt-1 text-xs text-lime/45">
                    {isAdmin ? t.volume.roomHintAdmin : t.volume.roomHint}
                </p>
            </div>
        </div>
    );
}
