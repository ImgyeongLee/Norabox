import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PostCard, postCardSelect } from '@/components/forum/PostCard';
import { getI18n } from '@/i18n/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { listableFor } from '@/lib/post-access';
import { USER_ACTIVE } from '@/lib/users';

export async function generateMetadata(): Promise<Metadata> {
    const { t } = await getI18n();
    return { title: t.meta.liked };
}

export default async function LikedPage(props: PageProps<'/liked'>) {
    const [user, { t }, sp] = await Promise.all([getCurrentUser(), getI18n(), props.searchParams]);
    if (!user) redirect('/login?next=/liked');
    const q = typeof sp.q === 'string' ? sp.q.trim().slice(0, 100) : '';
    const text = { contains: q, mode: 'insensitive' as const };
    const likes = await prisma.postLike.findMany({
        where: {
            userId: user.id,
            post: {
                AND: [
                    // Liked playlists the author later made private drop out.
                    listableFor(user.id),
                    ...(q
                        ? [
                              {
                                  OR: [
                                      { title: text },
                                      { scenario: { name: text } },
                                      { scenario: { writer: text } },
                                      { author: { username: text, status: USER_ACTIVE } },
                                  ],
                              },
                          ]
                        : []),
                ],
            },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: { post: { select: postCardSelect } },
    });

    return (
        <div className="mx-auto max-w-6xl px-4 py-10">
            <h1 className="text-3xl font-bold">{t.liked.title}</h1>
            <p className="mt-1 max-w-2xl muted">{t.liked.lead}</p>
            <form className="mt-6 flex max-w-md gap-2" role="search">
                <input
                    name="q"
                    type="search"
                    defaultValue={q}
                    className="input"
                    placeholder={t.liked.searchPlaceholder}
                    aria-label={t.liked.searchLabel}
                />
                <button className="btn-secondary shrink-0">{t.liked.search}</button>
            </form>
            {likes.length === 0 ? (
                <div className="card mt-8 p-10 text-center">
                    <p className="text-lg font-semibold">{q ? t.liked.noMatch : t.liked.empty}</p>
                    <Link href="/forum" className="btn-primary mt-4">
                        {t.liked.browse}
                    </Link>
                </div>
            ) : (
                <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {likes.map(({ post }) => (
                        <li key={post.id}>
                            <PostCard post={post} viewerId={user.id} />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
