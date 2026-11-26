import Link from 'next/link';
import type { ComponentProps } from 'react';

/**
 * Site links, with prefetch off by default. Every page is rendered per request (the root layout
 * reads cookies and the session), so a prefetch is a function run and a CDN request that the
 * click repeats anyway. Pass `prefetch` to opt back in for a single link.
 */
export default function AppLink(props: ComponentProps<typeof Link>) {
    return <Link prefetch={false} {...props} />;
}
