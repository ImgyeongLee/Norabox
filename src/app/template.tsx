'use client';

import { useEffect, useState } from 'react';

// True until the first page of a visit has mounted (stays true on the server).
let firstPage = true;

/**
 * Fades each page in when you move to it inside the site. A template, unlike a layout, mounts
 * anew on every navigation. The first page of a visit isn't faded, so its first paint (and LCP)
 * isn't delayed; the header and footer (in the layout) don't fade at all.
 */
export default function Template({ children }: { children: React.ReactNode }) {
    const [fade] = useState(() => !firstPage);
    useEffect(() => {
        firstPage = false;
    }, []);
    return <div className={fade ? 'page-enter' : undefined}>{children}</div>;
}
