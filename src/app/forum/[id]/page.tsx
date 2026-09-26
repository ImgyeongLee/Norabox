import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { Avatar } from '@/components/Avatar';
import { DeletePostButton } from '@/components/forum/DeletePostButton';
import { YouTubeEmbed } from '@/components/forum/YouTubeEmbed';
import { avatarUrlFor } from '@/lib/avatar';
import { getCurrentUser } from '@/lib/auth';
import { formatDate, formatDuration } from '@/lib/format';
import { prisma } from '@/lib/prisma';

const getPost = cache((id: string) =>
    prisma.post.findUnique({
        where: { id },
        include: {
            author: { select: { id: true, username: true, avatarMime: true, updatedAt: true } },
            tracks: { orderBy: { position: 'asc' } },
        },
    }),
);

export async function generateMetadata(props: PageProps<'/forum/[id]'>): Promise<Metadata> {
    const post = await getPost((await props.params).id);
    return post ? { title: post.title, description: post.description ?? undefined } : {};
}

export default async function PostPage(props: PageProps<'/forum/[id]'>) {
    const { id } = await props.params;
    const [post, user] = await Promise.all([getPost(id), getCurrentUser()]);
    if (!post) notFound();
    const isAuthor = user?.id === post.authorId;
    const edited = post.updatedAt.getTime() - post.createdAt.getTime() > 60_000;

    return (
        <article className="mx-auto max-w-3xl px-4 py-10">
            <Link href="/forum" className="text-sm text-lime/60 hover:text-lime">
                ← Back to forum
            </Link>
            <header className="mt-4">
                <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">{post.title}</h1>
                {post.description && (
                    <p className="mt-2 text-lg font-medium text-moss sm:text-xl">{post.description}</p>
                )}
                <div className="mt-5 flex flex-wrap items-center gap-3">
                    <Avatar name={post.author.username} src={avatarUrlFor(post.author)} size="md" />
                    <div className="text-sm">
                        <p className="font-semibold">{post.author.username}</p>
                        <p className="text-lime/55">
                            <time dateTime={post.createdAt.toISOString()}>{formatDate(post.createdAt)}</time>
                            {edited && ' · edited'} · {post.tracks.length} song{post.tracks.length === 1 ? '' : 's'}
                        </p>
                    </div>
                    {isAuthor && (
                        <div className="ml-auto flex gap-2">
                            <Link href={`/forum/${post.id}/edit`} className="btn-secondary px-3 py-2">
                                Edit
                            </Link>
                            <DeletePostButton id={post.id} />
                        </div>
                    )}
                </div>
            </header>

            {post.body && (
                <div className="card mt-8 whitespace-pre-wrap p-5 leading-relaxed text-lime/85">{post.body}</div>
            )}

            <ol className="mt-8 space-y-8">
                {post.tracks.map((t, i) => (
                    <li key={t.id}>
                        <div className="mb-2 flex items-baseline gap-3">
                            <span className="font-mono text-sm text-moss">{String(i + 1).padStart(2, '0')}</span>
                            <div className="min-w-0">
                                <h2 className="font-semibold leading-snug">{t.title}</h2>
                                <p className="text-sm text-lime/55">
                                    {t.channel}
                                    {t.durationSec ? ` · ${formatDuration(t.durationSec)}` : ''}
                                </p>
                            </div>
                        </div>
                        <YouTubeEmbed videoId={t.videoId} title={t.title} />
                    </li>
                ))}
            </ol>
        </article>
    );
}
