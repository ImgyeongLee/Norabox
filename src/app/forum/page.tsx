/* eslint-disable @next/next/no-img-element -- YouTube thumbnails */
import type { Metadata } from 'next';
import Link from 'next/link';
import { Avatar } from '@/components/Avatar';
import { avatarUrlFor } from '@/lib/avatar';
import { getCurrentUser } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { getI18n } from '@/i18n/server';
import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';

export async function generateMetadata(): Promise<Metadata> {
    const { t } = await getI18n();
    return { title: t.meta.forum };
}

const PAGE_SIZE = 12;

export default async function ForumPage(props: PageProps<'/forum'>) {
    const sp = await props.searchParams;
    const page = Math.max(1, Number(sp.page) || 1);
    const q = typeof sp.q === 'string' ? sp.q.trim().slice(0, 100) : '';
    const scenarioId = typeof sp.scenario === 'string' ? sp.scenario : '';
    const text = { contains: q, mode: 'insensitive' as const };
    const where: Prisma.PostWhereInput = {
        ...(scenarioId ? { scenarioId } : {}),
        ...(q ? { OR: [{ title: text }, { scenario: { name: text } }, { scenario: { writer: text } }] } : {}),
    };

    const [{ t, locale }, user, scenario, posts, total] = await Promise.all([
        getI18n(),
        getCurrentUser(),
        scenarioId ? prisma.scenario.findUnique({ where: { id: scenarioId }, select: { name: true, writer: true } }) : null,
        prisma.post.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * PAGE_SIZE,
            take: PAGE_SIZE,
            select: {
                id: true,
                title: true,
                scenario: { select: { id: true, name: true, writer: true } },
                createdAt: true,
                author: { select: { id: true, username: true, avatarMime: true, updatedAt: true } },
                tracks: { orderBy: { position: 'asc' }, take: 1, select: { videoId: true } },
                _count: { select: { tracks: true } },
            },
        }),
        prisma.post.count({ where }),
    ]);
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const pageHref = (p: number) =>
        `/forum?${new URLSearchParams({ ...(q ? { q } : {}), ...(scenarioId ? { scenario: scenarioId } : {}), page: String(p) })}`;

    return (
        <div className="mx-auto max-w-6xl px-4 py-10">
            <div className="flex flex-wrap items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold">{t.forum.title}</h1>
                    <p className="mt-1 text-lime/60">{t.forum.lead}</p>
                </div>
                <Link href={user ? '/forum/new' : '/login?next=/forum/new'} className="btn-primary ml-auto">
                    {t.forum.share}
                </Link>
            </div>

            <form className="mt-6 flex max-w-md gap-2" role="search">
                <input
                    name="q"
                    defaultValue={q}
                    className="input"
                    placeholder={t.forum.searchPlaceholder}
                    aria-label={t.forum.searchLabel}
                />
                {scenarioId && <input type="hidden" name="scenario" value={scenarioId} />}
                <button className="btn-secondary">{t.forum.search}</button>
            </form>

            {scenario && (
                <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-lime/60">{t.forum.scenarioFilter}</span>
                    <span className="rounded-full border border-moss/50 bg-fern/50 px-3 py-1 font-medium">
                        {scenario.name}
                        {scenario.writer && <span className="text-lime/60"> · {scenario.writer}</span>}
                    </span>
                    <Link href={q ? `/forum?${new URLSearchParams({ q })}` : '/forum'} className="text-moss hover:underline">
                        {t.forum.showAll}
                    </Link>
                </div>
            )}

            {posts.length === 0 ? (
                <div className="card mt-8 p-10 text-center">
                    <p className="text-lg font-semibold">
                        {q || scenarioId ? t.forum.noMatch : t.forum.noPosts}
                    </p>
                    <p className="mt-1 text-sm text-lime/60">
                        {q || scenarioId ? t.forum.tryAnother : t.forum.beFirst}
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
                                        {t.common.songs(p._count.tracks)}
                                    </span>
                                </div>
                                <div className="p-4">
                                    <h2 className="line-clamp-2 text-lg font-semibold leading-snug">{p.title}</h2>
                                    {p.scenario && (
                                        <p className="mt-1 line-clamp-2 text-sm">
                                            <span className="font-medium text-moss">{p.scenario.name}</span>
                                            {p.scenario.writer && (
                                                <span className="text-lime/55"> · {p.scenario.writer}</span>
                                            )}
                                        </p>
                                    )}
                                    <div className="mt-4 flex items-center gap-2 text-xs text-lime/55">
                                        <Avatar name={p.author.username} src={avatarUrlFor(p.author)} size="xs" />
                                        <span className="truncate">{p.author.username}</span>
                                        <span>·</span>
                                        <time dateTime={p.createdAt.toISOString()}>{formatDate(p.createdAt, locale)}</time>
                                    </div>
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}

            {pages > 1 && (
                <nav className="mt-10 flex items-center justify-center gap-3" aria-label={t.forum.pagination}>
                    {page > 1 ? (
                        <Link href={pageHref(page - 1)} className="btn-secondary">
                            {t.forum.prev}
                        </Link>
                    ) : (
                        <span className="btn-secondary opacity-40">{t.forum.prev}</span>
                    )}
                    <span className="text-sm text-lime/60">
                        {t.forum.page(page, pages)}
                    </span>
                    {page < pages ? (
                        <Link href={pageHref(page + 1)} className="btn-secondary">
                            {t.forum.next}
                        </Link>
                    ) : (
                        <span className="btn-secondary opacity-40">{t.forum.next}</span>
                    )}
                </nav>
            )}
        </div>
    );
}
