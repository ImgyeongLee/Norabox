// Small inline icon set (stroke icons, 24×24).
type P = React.SVGProps<SVGSVGElement>;
const base = (p: P) => ({
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    className: 'size-5',
    ...p,
});

export const PlayIcon = (p: P) => (
    <svg {...base(p)}>
        <path d="M7 4.5v15l12-7.5z" fill="currentColor" />
    </svg>
);
export const PauseIcon = (p: P) => (
    <svg {...base(p)}>
        <rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" />
        <rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" />
    </svg>
);
export const NextIcon = (p: P) => (
    <svg {...base(p)}>
        <path d="M5 5v14l10-7z" fill="currentColor" />
        <path d="M19 5v14" />
    </svg>
);
export const PrevIcon = (p: P) => (
    <svg {...base(p)}>
        <path d="M19 5v14L9 12z" fill="currentColor" />
        <path d="M5 5v14" />
    </svg>
);
export const RepeatIcon = (p: P) => (
    <svg {...base(p)}>
        <path d="M17 2l4 4-4 4" />
        <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
        <path d="M7 22l-4-4 4-4" />
        <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </svg>
);
export const VolumeIcon = ({ muted, ...p }: P & { muted?: boolean }) => (
    <svg {...base(p)}>
        <path d="M11 5L6 9H2v6h4l5 4z" fill="currentColor" />
        {muted ? <path d="M22 9l-6 6M16 9l6 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />}
    </svg>
);
export const GripIcon = (p: P) => (
    <svg {...base(p)}>
        <circle cx="9" cy="6" r="1" fill="currentColor" />
        <circle cx="15" cy="6" r="1" fill="currentColor" />
        <circle cx="9" cy="12" r="1" fill="currentColor" />
        <circle cx="15" cy="12" r="1" fill="currentColor" />
        <circle cx="9" cy="18" r="1" fill="currentColor" />
        <circle cx="15" cy="18" r="1" fill="currentColor" />
    </svg>
);
export const TrashIcon = (p: P) => (
    <svg {...base(p)}>
        <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
    </svg>
);
