import Link from 'next/link';

export function Logo() {
    return (
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-lime">
            <svg viewBox="0 0 32 32" className="size-8 overflow-visible" aria-hidden>
                <rect width="32" height="32" rx="9" className="fill-moss" />
                <path
                    d="M9 22V10l14 12V10"
                    className="stroke-pine"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                />
                {/* Santa hat, shown only while the Christmas look is on (globals.css). */}
                <g className="season-hat" transform="rotate(16 22 4)">
                    <path d="M12.5 4.5 C14 -3 21 -9 30.5 -7.5 L28.5 4.5 Z" fill="#d94040" />
                    <rect x="11" y="2.5" width="19.5" height="4.5" rx="2.25" fill="#f5efe0" />
                    <circle cx="30.5" cy="-7.5" r="2.6" fill="#f5efe0" />
                </g>
            </svg>
            <span className="text-lg">Norabox</span>
        </Link>
    );
}
