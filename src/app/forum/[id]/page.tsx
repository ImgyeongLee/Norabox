import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { Avatar } from '@/components/Avatar';
import { DeletePostButton } from '@/components/forum/DeletePostButton';
import { PostActions } from '@/components/forum/PostActions';
import { YouTubeEmbed } from '@/components/forum/YouTubeEmbed';
import { Markdown } from '@/components/Markdown';
import { avatarUrlFor } from '@/lib/avatar';
import { getCurrentUser } from '@/lib/auth';
import { formatDate, formatDuration } from '@/lib/format';
import { getI18n } from '@/i18n/server';
import { prisma } from '@/lib/prisma';

const getPost = cache((id: string) =>
    prisma.post.findUnique({
        where: { id },
        include: {
            author: { select: { id: true, username: true, avatarMime: true, updatedAt: true } },
            scenario: { select: { id: true, name: true, writer: true } },
            tracks: { orderBy: { position: 'asc' } },
            _count: { select: { likes: true } },
        },
    }),
);

export async function generateMetadata(props: PageProps<'/forum/[id]'>): Promise<Metadata> {
    const [post, { t }] = await Promise.all([getPost((await props.params).id), getI18n()]);
    if (!post) return {};
    const s = post.scenario;
    const scenario = s && (s.writer ? t.meta.scenarioBy(s.name, s.writer) : s.name);
    return { title: post.title, description: scenario ? t.meta.postDescription(scenario) : undefined };
}

export default async function PostPage(props: PageProps<'/forum/[id]'>) {
    const { id } = await props.params;
    const [post, user, { t, locale }] = await Promise.all([getPost(id), getCurrentUser(), getI18n()]);
    if (!post) notFound();
    const isAuthor = user?.id === post.authorId;
    const liked = user
        ? !!(await prisma.postLike.findUnique({ where: { userId_postId: { userId: user.id, postId: post.id } } }))
        : false;
    const edited = post.updatedAt.getTime() - post.createdAt.getTime() > 60_000;

    return (
        <article className="mx-auto max-w-3xl px-4 py-10">
            <Link href="/forum" className="text-sm text-lime/60 hover:text-lime">
                {t.post.back}
            </Link>
            <header className="mt-4">
                <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">{post.title}</h1>
                {post.scenario && (
                    <p className="mt-2 text-lg sm:text-xl">
                        <Link
                            href={`/forum?scenario=${post.scenario.id}`}
                            className="font-medium text-moss underline-offset-4 hover:underline"
                            title={t.post.seeScenario}
                        >
                            {post.scenario.name}
                        </Link>
                        {post.scenario.writer && <span className="text-lime/60"> · {post.scenario.writer}</span>}
                    </p>
                )}
                <div className="mt-5 flex flex-wrap items-center gap-3">
                    <Avatar name={post.author.username} src={avatarUrlFor(post.author)} size="md" />
                    <div className="text-sm">
                        <p className="font-semibold">{post.author.username}</p>
                        <p className="text-lime/55">
                            <time dateTime={post.createdAt.toISOString()}>{formatDate(post.createdAt, locale)}</time>
                            {edited && ` · ${t.post.edited}`} · {t.common.songs(post.tracks.length)}
                        </p>
                    </div>
                    {isAuthor && (
                        <div className="ml-auto flex gap-2">
                            <Link href={`/forum/${post.id}/edit`} className="btn-secondary px-3 py-2">
                                {t.post.edit}
                            </Link>
                            <DeletePostButton id={post.id} />
                        </div>
                    )}
                </div>
                <div className="mt-5">
                    <PostActions postId={post.id} signedIn={!!user} liked={liked} likeCount={post._count.likes} />
                </div>
            </header>

            <ol className="mt-8 space-y-6">
                {post.tracks.map((track, i) => (
                    <li key={track.id} className="card space-y-4 p-4 sm:p-5">
                        <div className="flex items-baseline gap-3">
                            <span className="font-mono text-sm font-semibold text-moss">
                                {String(i + 1).padStart(2, '0')}
                            </span>
                            <div className="min-w-0">
                                <h2 className="font-semibold leading-snug">{track.title}</h2>
                                <p className="text-sm text-lime/55">
                                    {t.post.videoBy(track.channel)}
                                    {track.durationSec ? ` · ${formatDuration(track.durationSec)}` : ''}
                                </p>
                            </div>
                        </div>
                        <YouTubeEmbed videoId={track.videoId} title={track.title} />
                        {track.description && <Markdown className="text-lime/85">{track.description}</Markdown>}
                    </li>
                ))}
            </ol>
        </article>
    );
}
