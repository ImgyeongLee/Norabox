import type { Metadata } from 'next';
import Link from 'next/link';
import { cache } from 'react';
import { LuArrowLeft } from 'react-icons/lu';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/icons';
import { DeletePostButton } from '@/components/forum/DeletePostButton';
import { PostActions } from '@/components/forum/PostActions';
import { SharePanel } from '@/components/forum/SharePanel';
import { VisibilityBadge } from '@/components/forum/VisibilityBadge';
import { YouTubeEmbed } from '@/components/forum/YouTubeEmbed';
import { Markdown } from '@/components/Markdown';
import type { CurrentUser } from '@/lib/auth';
import { formatDate, formatDuration } from '@/lib/format';
import { getI18n } from '@/i18n/server';
import { prisma } from '@/lib/prisma';
import { authorSelect, authorView } from '@/lib/users';

const include = {
    author: { select: authorSelect },
    scenario: { select: { id: true, name: true, writer: true } },
    tracks: { orderBy: { position: 'asc' } },
    _count: { select: { likes: true } },
} as const;

export const getPostById = cache((id: string) => prisma.post.findUnique({ where: { id }, include }));
export const getPostByShareToken = cache((token: string) =>
    prisma.post.findUnique({ where: { shareToken: token }, include }),
);

type FullPost = NonNullable<Awaited<ReturnType<typeof getPostById>>>;

/** Page metadata for a playlist the viewer is allowed to see. */
export async function postMetadata(post: FullPost): Promise<Metadata> {
    const { t } = await getI18n();
    const s = post.scenario;
    const scenario = s && (s.writer ? t.meta.scenarioBy(s.name, s.writer) : s.name);
    return {
        title: post.title,
        description: scenario ? t.meta.postDescription(scenario) : undefined,
        // Only public playlists belong in search engines.
        robots: post.visibility === 'public' ? undefined : { index: false, follow: false },
    };
}

/**
 * A playlist page. Rendered for the post URL (/forum/<id>) and the share link
 * (/s/<token>); the routes decide who may see it, this decides what they see.
 */
export async function PostView({
    post,
    user,
    viaShareToken,
}: {
    post: FullPost;
    user: CurrentUser | null;
    /** Set when the viewer arrived through the share link. */
    viaShareToken?: string;
}) {
    const { t, locale } = await getI18n();
    const isAuthor = user?.id === post.authorId;
    const author = authorView(post.author);
    const liked = user
        ? !!(await prisma.postLike.findUnique({ where: { userId_postId: { userId: user.id, postId: post.id } } }))
        : false;
    const edited = post.updatedAt.getTime() - post.createdAt.getTime() > 60_000;

    const viewPath = viaShareToken ? `/s/${viaShareToken}` : `/forum/${post.id}`;
    const sharePath =
        post.visibility === 'public'
            ? `/forum/${post.id}`
            : post.visibility === 'unlisted' && (isAuthor || viaShareToken)
              ? `/s/${post.shareToken}`
              : null;

    return (
        <article className="mx-auto max-w-3xl px-4 py-10">
            <Link
                href={isAuthor ? '/playlists' : '/forum'}
                className="inline-flex items-center gap-1 text-sm text-lime/60 hover:text-lime"
            >
                <Icon as={LuArrowLeft} className="size-4" />
                {isAuthor ? t.myPlaylists.title : t.post.back}
            </Link>
            <header className="mt-4">
                {isAuthor && (
                    <div className="mb-2">
                        <VisibilityBadge visibility={post.visibility} t={t} />
                    </div>
                )}
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
                    <Avatar name={author.name ?? '?'} src={author.avatarUrl} size="md" />
                    <div className="text-sm">
                        <p className={`font-semibold ${author.name ? '' : 'italic text-lime/60'}`}>
                            {author.name ?? t.common.deletedUser}
                        </p>
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
                {isAuthor && <SharePanel postId={post.id} visibility={post.visibility} shareToken={post.shareToken} />}
                <div className="mt-5">
                    <PostActions
                        postId={post.id}
                        signedIn={!!user}
                        liked={liked}
                        likeCount={post._count.likes}
                        viewPath={viewPath}
                        sharePath={sharePath}
                        shareToken={viaShareToken ?? (isAuthor ? post.shareToken : null)}
                    />
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
