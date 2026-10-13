import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LuPlus } from 'react-icons/lu';
import { PostCard, postCardSelect } from '@/components/forum/PostCard';
import { Icon } from '@/components/icons';
import { getI18n } from '@/i18n/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function generateMetadata(): Promise<Metadata> {
    const { t } = await getI18n();
    return { title: t.meta.myPlaylists };
}

/** The signed-in user's own playlists, of every visibility, newest edits first. */
export default async function MyPlaylistsPage(props: PageProps<'/playlists'>) {
    const [user, { t }, sp] = await Promise.all([getCurrentUser(), getI18n(), props.searchParams]);

    if (!user) redirect('/login?next=/playlists');

    const q = typeof sp.q === 'string' ? sp.q.trim().slice(0, 100) : '';
    const text = { contains: q, mode: 'insensitive' as const };
    const posts = await prisma.post.findMany({
        where: {
            authorId: user.id,
            ...(q ? { OR: [{ title: text }, { scenario: { name: text } }, { scenario: { writer: text } }] } : {}),
        },
        orderBy: { updatedAt: 'desc' },
        take: 200,
        select: postCardSelect,
    });

    return (
        <div className="mx-auto max-w-6xl px-4 py-10">
            <div className="flex flex-wrap items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold">{t.myPlaylists.title}</h1>
                    <p className="mt-1 max-w-2xl muted">{t.myPlaylists.lead}</p>
                </div>
                <Link href="/playlists/new" className="btn-primary ml-auto">
                    <Icon as={LuPlus} />
                    {t.myPlaylists.new}
                </Link>
            </div>
            <form className="mt-6 flex max-w-md gap-2" role="search">
                <input
                    name="q"
                    type="search"
                    defaultValue={q}
                    className="input"
                    placeholder={t.myPlaylists.searchPlaceholder}
                    aria-label={t.myPlaylists.searchLabel}
                />
                <button className="btn-secondary shrink-0">{t.myPlaylists.search}</button>
            </form>
            {posts.length === 0 ? (
                <div className="card mt-8 p-10 text-center">
                    <p className="text-lg font-semibold">{q ? t.myPlaylists.noMatch : t.myPlaylists.empty}</p>
                    {!q && (
                        <Link href="/playlists/new" className="btn-primary mt-4">
                            <Icon as={LuPlus} />
                            {t.myPlaylists.new}
                        </Link>
                    )}
                </div>
            ) : (
                <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {posts.map((post) => (
                        <li key={post.id}>
                            <PostCard post={post} viewerId={user.id} showVisibility />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
