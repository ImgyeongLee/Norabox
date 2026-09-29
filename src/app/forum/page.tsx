import type { Metadata } from 'next';
import Link from 'next/link';
import { PostCard, postCardSelect } from '@/components/forum/PostCard';
import { getCurrentUser } from '@/lib/auth';
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

    const [{ t }, user, scenario, posts, total] = await Promise.all([
        getI18n(),
        getCurrentUser(),
        scenarioId ? prisma.scenario.findUnique({ where: { id: scenarioId }, select: { name: true, writer: true } }) : null,
        prisma.post.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * PAGE_SIZE,
            take: PAGE_SIZE,
            select: postCardSelect,
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
                            <PostCard post={p} />
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
