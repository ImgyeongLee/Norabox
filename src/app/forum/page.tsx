/* eslint-disable @next/next/no-img-element -- YouTube thumbnails */
import type { Metadata } from 'next';
import Link from 'next/link';
import { Avatar } from '@/components/Avatar';
import { avatarUrlFor } from '@/lib/avatar';
import { getCurrentUser } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Forum' };

const PAGE_SIZE = 12;

export default async function ForumPage(props: PageProps<'/forum'>) {
    const sp = await props.searchParams;
    const page = Math.max(1, Number(sp.page) || 1);
    const q = typeof sp.q === 'string' ? sp.q.trim().slice(0, 100) : '';
    const where = q ? { OR: [{ title: { contains: q, mode: 'insensitive' as const } }, { description: { contains: q, mode: 'insensitive' as const } }] } : {};

    const [user, posts, total] = await Promise.all([
        getCurrentUser(),
        prisma.post.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * PAGE_SIZE,
            take: PAGE_SIZE,
            select: {
                id: true,
                title: true,
                description: true,
                createdAt: true,
                author: { select: { id: true, username: true, avatarMime: true, updatedAt: true } },
                tracks: { orderBy: { position: 'asc' }, take: 1, select: { videoId: true } },
                _count: { select: { tracks: true } },
            },
        }),
        prisma.post.count({ where }),
    ]);
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const pageHref = (p: number) => `/forum?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;

    return (
        <div className="mx-auto max-w-6xl px-4 py-10">
            <div className="flex flex-wrap items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Forum</h1>
                    <p className="mt-1 text-lime/60">Playlists shared by the Norabox community.</p>
                </div>
                <Link href={user ? '/forum/new' : '/login?next=/forum/new'} className="btn-primary ml-auto">
                    Share a playlist
                </Link>
            </div>

            <form className="mt-6 flex max-w-md gap-2" role="search">
                <input
                    name="q"
                    defaultValue={q}
                    className="input"
                    placeholder="Search posts"
                    aria-label="Search posts"
                />
                <button className="btn-secondary">Search</button>
            </form>

            {posts.length === 0 ? (
                <div className="card mt-8 p-10 text-center">
                    <p className="text-lg font-semibold">{q ? 'No posts match your search.' : 'No posts yet.'}</p>
                    <p className="mt-1 text-sm text-lime/60">
                        {q ? 'Try another search.' : 'Be the first to share a playlist!'}
                    </p>
                </div>
            ) : (
                <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {posts.map((p) => (
                        <li key={p.id}>
                            <Link
                                href={`/forum/${p.id}`}
                                className="card group block h-full overflow-hidden transition hover:border-moss/70 hover:bg-fern/50">
                                <div className="relative aspect-video bg-pine">
                                    {p.tracks[0] && (
                                        <img
                                            src={`https://i.ytimg.com/vi/${p.tracks[0].videoId}/hqdefault.jpg`}
                                            alt=""
                                            className="size-full object-cover opacity-85 transition group-hover:opacity-100"
                                        />
                                    )}
                                    <span className="absolute bottom-2 right-2 rounded-full bg-pine/85 px-2.5 py-1 text-xs font-semibold">
                                        {p._count.tracks} song{p._count.tracks === 1 ? '' : 's'}
                                    </span>
                                </div>
                                <div className="p-4">
                                    <h2 className="line-clamp-2 text-lg font-semibold leading-snug">{p.title}</h2>
                                    {p.description && (
                                        <p className="mt-1 line-clamp-2 text-sm text-moss">{p.description}</p>
                                    )}
                                    <div className="mt-4 flex items-center gap-2 text-xs text-lime/55">
                                        <Avatar name={p.author.username} src={avatarUrlFor(p.author)} size="xs" />
                                        <span className="truncate">{p.author.username}</span>
                                        <span>·</span>
                                        <time dateTime={p.createdAt.toISOString()}>{formatDate(p.createdAt)}</time>
                                    </div>
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}

            {pages > 1 && (
                <nav className="mt-10 flex items-center justify-center gap-3" aria-label="Pagination">
                    {page > 1 ? (
                        <Link href={pageHref(page - 1)} className="btn-secondary">
                            Previous
                        </Link>
                    ) : (
                        <span className="btn-secondary opacity-40">Previous</span>
                    )}
                    <span className="text-sm text-lime/60">
                        Page {page} of {pages}
                    </span>
                    {page < pages ? (
                        <Link href={pageHref(page + 1)} className="btn-secondary">
                            Next
                        </Link>
                    ) : (
                        <span className="btn-secondary opacity-40">Next</span>
                    )}
                </nav>
            )}
        </div>
    );
}
