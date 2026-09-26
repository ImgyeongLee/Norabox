/* eslint-disable @next/next/no-img-element -- avatars are tiny, versioned API images */
type Props = { name: string; src: string | null | undefined; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' };

const SIZES = {
    xs: 'size-6 text-[10px]',
    sm: 'size-8 text-xs',
    md: 'size-10 text-sm',
    lg: 'size-16 text-xl',
    xl: 'size-24 text-3xl',
};

/** Small circular profile badge; falls back to the name's first letter. */
export function Avatar({ name, src, size = 'sm' }: Props) {
    const cls = `${SIZES[size]} shrink-0 rounded-full ring-2 ring-moss/60 overflow-hidden`;
    if (src) return <img src={src} alt="" className={`${cls} object-cover`} />;
    return (
        <span
            aria-hidden
            className={`${cls} inline-flex items-center justify-center bg-leaf font-bold uppercase text-lime`}>
            {name.slice(0, 1) || '?'}
        </span>
    );
}
