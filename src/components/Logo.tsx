import Link from 'next/link';

export function Logo() {
    return (
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-lime">
            <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
                <rect width="32" height="32" rx="9" fill="#90A955" />
                <path
                    d="M9 22V10l14 12V10"
                    stroke="#132A13"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                />
            </svg>
            <span className="text-lg">Norabox</span>
        </Link>
    );
}
