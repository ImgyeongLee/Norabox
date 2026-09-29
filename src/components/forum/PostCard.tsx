/* eslint-disable @next/next/no-img-element -- YouTube thumbnails */
import Link from 'next/link';
import { Avatar } from '@/components/Avatar';
import { HeartIcon } from '@/components/icons-extra';
import { getI18n } from '@/i18n/server';
import { formatDate } from '@/lib/format';
import { authorSelect, authorView } from '@/lib/users';

/** Prisma `select` for the fields a card shows. */
export const postCardSelect = {
    id: true,
    title: true,
    scenario: { select: { id: true, name: true, writer: true } },
    createdAt: true,
    author: { select: authorSelect },
    tracks: { orderBy: { position: 'asc' }, take: 1, select: { videoId: true } },
    _count: { select: { tracks: true, likes: true } },
} as const;

type CardPost = {
    id: string;
    title: string;
    scenario: { name: string; writer: string | null } | null;
    createdAt: Date;
    author: { id: string; username: string; avatarMime: string | null; updatedAt: Date; status: string };
    tracks: { videoId: string }[];
    _count: { tracks: number; likes: number };
};

/** Forum post card, used by the forum list and the liked playlists page. */
export async function PostCard({ post: p }: { post: CardPost }) {
    const { t, locale } = await getI18n();
    const author = authorView(p.author);
    return (
        <Link
            href={`/forum/${p.id}`}
            className="card group block h-full overflow-hidden transition hover:border-moss/70 hover:bg-fern/50"
        >
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
                        {p.scenario.writer && <span className="text-lime/55"> · {p.scenario.writer}</span>}
                    </p>
                )}
                <div className="mt-4 flex items-center gap-2 text-xs text-lime/55">
                    <Avatar name={author.name ?? '?'} src={author.avatarUrl} size="xs" />
                    <span className={`truncate ${author.name ? '' : 'italic'}`}>{author.name ?? t.common.deletedUser}</span>
                    <span>·</span>
                    <time dateTime={p.createdAt.toISOString()}>{formatDate(p.createdAt, locale)}</time>
                    <span className="ml-auto inline-flex shrink-0 items-center gap-1" aria-label={t.forum.likes(p._count.likes)}>
                        <HeartIcon className="size-3.5" filled={p._count.likes > 0} />
                        {p._count.likes}
                    </span>
                </div>
            </div>
        </Link>
    );
}
