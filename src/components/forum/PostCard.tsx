/* eslint-disable @next/next/no-img-element -- YouTube thumbnails */
import Link from 'next/link';
import { Avatar } from '@/components/Avatar';
import { HeartIcon } from '@/components/icons-extra';
import { getI18n } from '@/i18n/server';
import { VisibilityBadge } from '@/components/forum/VisibilityBadge';
import { formatDate } from '@/lib/format';
import type { ListView } from '@/lib/list-view';
import { postHref } from '@/lib/post-access';
import { authorSelect, authorView } from '@/lib/users';

/** Prisma `select` for the fields a card shows. */
export const postCardSelect = {
    id: true,
    title: true,
    authorId: true,
    visibility: true,
    shareToken: true,
    anonymous: true,
    scenario: { select: { id: true, name: true, writer: true } },
    createdAt: true,
    author: { select: authorSelect },
    tracks: { orderBy: { position: 'asc' }, take: 1, select: { videoId: true } },
    _count: { select: { tracks: true, likes: true } },
} as const;

type CardPost = {
    id: string;
    title: string;
    authorId: string;
    visibility: string;
    shareToken: string;
    anonymous: boolean;
    scenario: { name: string; writer: string | null } | null;
    createdAt: Date;
    author: { id: string; username: string; avatarMime: string | null; updatedAt: Date; status: string };
    tracks: { videoId: string }[];
    _count: { tracks: number; likes: number };
};

/** Classes for the <ul> around PostCards in each view. */
export const postListClass = (view: ListView) =>
    view === 'list' ? 'mt-8 space-y-2' : 'mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';

/**
 * Playlist card, used by the forum, liked playlists and My playlists: a card for the grid, or a
 * compact row for the list view. Links to the share link for someone else's link-only playlist
 * (the post URL wouldn't open for them).
 */
export async function PostCard({
    post: p,
    viewerId,
    showVisibility,
    view = 'card',
}: {
    post: CardPost;
    viewerId: string | null;
    showVisibility?: boolean;
    view?: ListView;
}) {
    const { t, locale } = await getI18n();
    const author = authorView(p.author, p.anonymous);
    const thumbnail = p.tracks[0] && `https://i.ytimg.com/vi/${p.tracks[0].videoId}/hqdefault.jpg`;
    const scenario = p.scenario && (
        <p className={`text-sm ${view === 'list' ? 'truncate' : 'mt-1 line-clamp-2'}`}>
            <span className="font-medium text-moss">{p.scenario.name}</span>
            {p.scenario.writer && <span className="text-lime/55"> · {p.scenario.writer}</span>}
        </p>
    );
    const byline = (
        <>
            <Avatar name={author.name ?? '?'} src={author.avatarUrl} size="xs" />
            <span className={`truncate ${author.name ? '' : 'italic'}`}>
                {author.name ?? (author.anonymous ? t.common.anonymous : t.common.deletedUser)}
            </span>
            <span>·</span>
            <time dateTime={p.createdAt.toISOString()} className="shrink-0">
                {formatDate(p.createdAt, locale)}
            </time>
        </>
    );
    const likes = (
        <span className="ml-auto inline-flex shrink-0 items-center gap-1" aria-label={t.forum.likes(p._count.likes)}>
            <HeartIcon className="size-3.5" filled={p._count.likes > 0} />
            {p._count.likes}
        </span>
    );

    if (view === 'list') {
        return (
            <Link
                href={postHref(p, viewerId)}
                className="card group flex items-center gap-3 p-2.5 transition hover:border-moss/70 hover:bg-fern/50 sm:gap-4">
                <div className="aspect-video w-24 shrink-0 overflow-hidden rounded-lg bg-pine sm:w-32">
                    {thumbnail && (
                        <img
                            src={thumbnail}
                            alt=""
                            className="size-full object-cover opacity-85 transition group-hover:opacity-100"
                        />
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        {showVisibility && <VisibilityBadge visibility={p.visibility} t={t} />}
                        <h2 className="truncate font-semibold leading-snug">{p.title}</h2>
                    </div>
                    {scenario}
                    <div className="mt-1 flex items-center gap-2 text-xs text-lime/55">
                        {byline}
                        <span>·</span>
                        <span className="shrink-0">{t.common.songs(p._count.tracks)}</span>
                        {likes}
                    </div>
                </div>
            </Link>
        );
    }

    return (
        <Link
            href={postHref(p, viewerId)}
            className="card group block h-full overflow-hidden transition hover:border-moss/70 hover:bg-fern/50"
        >
            <div className="relative aspect-video bg-pine">
                {thumbnail && (
                    <img
                        src={thumbnail}
                        alt=""
                        className="size-full object-cover opacity-85 transition group-hover:opacity-100"
                    />
                )}
                {showVisibility && (
                    <span className="absolute left-2 top-2">
                        <VisibilityBadge visibility={p.visibility} t={t} />
                    </span>
                )}
                <span className="absolute bottom-2 right-2 rounded-full bg-pine/85 px-2 py-0.5 text-[11px] font-semibold">
                    {t.common.songs(p._count.tracks)}
                </span>
            </div>
            <div className="p-3">
                <h2 className="line-clamp-2 font-semibold leading-snug">{p.title}</h2>
                {scenario}
                <div className="mt-3 flex items-center gap-2 text-xs text-lime/55">
                    {byline}
                    {likes}
                </div>
            </div>
        </Link>
    );
}
