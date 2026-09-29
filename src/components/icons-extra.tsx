// Icons for post actions (same 24×24 stroke style as icons.tsx).
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

export const HeartIcon = ({ filled, ...p }: P & { filled?: boolean }) => (
    <svg {...base(p)}>
        <path
            d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.9 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.3 0 5.6 3.1 4.4 6.6-1.7 4.8-9.2 9.4-9.2 9.4z"
            fill={filled ? 'currentColor' : 'none'}
        />
    </svg>
);
export const ShareIcon = (p: P) => (
    <svg {...base(p)}>
        <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" />
        <path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />
    </svg>
);
export const ImportIcon = ({ done, ...p }: P & { done?: boolean }) => (
    <svg {...base(p)}>
        {done ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 20h14" />}
    </svg>
);
