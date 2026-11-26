import { cookies } from 'next/headers';
import Link from '@/components/AppLink';
import { PlainThemeButton } from '@/components/home/PlainThemeButton';
import { HomeStart } from '@/components/home/HomeStart';
import { getCurrentUser } from '@/lib/auth';
import { getI18n } from '@/i18n/server';
import { themeOptions } from '@/lib/limited-themes';
import { liveRoomsOwnedBy } from '@/lib/rooms';
import { canViewPost } from '@/lib/post-access';
import { prisma } from '@/lib/prisma';
import { isPlainTheme, PLAIN_THEME_COOKIE } from '@/lib/site-theme';

/** The forum post named by `?import=<postId>` (from a post's Import button), if it exists. */
async function importingPlaylist(id: unknown, shareToken: unknown, viewerId: string | undefined) {
  if (typeof id !== 'string' || !/^[a-z0-9]{10,40}$/.test(id)) return null;
  const token = typeof shareToken === 'string' ? shareToken : null;
  const post = await prisma.post.findUnique({
    where: { id },
    select: {
      id: true,
      authorId: true,
      visibility: true,
      shareToken: true,
      title: true,
      scenario: { select: { name: true } },
      tracks: { orderBy: { position: 'asc' }, take: 1, select: { thumbnail: true } },
      _count: { select: { tracks: true } },
    },
  });
  // Private playlists only for their author; link-only ones need the share token.
  if (!post || !canViewPost(post, viewerId, token)) return null;
  return {
    id: post.id,
    shareToken: token,
    title: post.title,
    songCount: post._count.tracks,
    thumbnail: post.tracks[0]?.thumbnail ?? null,
    scenario: post.scenario?.name ?? null,
  };
}

export default async function Home(props: PageProps<'/'>) {
  const { import: importId, s: shareToken } = await props.searchParams;
  const [user, { t }, cookieStore] = await Promise.all([getCurrentUser(), getI18n(), cookies()]);
  // A member's open rooms come with the page; guests' are asked for by the card, if they made any.
  const [importing, ownRooms] = await Promise.all([
    importingPlaylist(importId, shareToken, user?.id),
    user ? liveRoomsOwnedBy({ userId: user.id }) : [],
  ]);
  const link = 'font-semibold text-moss underline-offset-4 hover:underline';
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
      <HomeStart
        importing={importing}
        themes={themeOptions()}
        ownRooms={ownRooms}
        hero={
          <div className="pt-2">
            <p className="mb-3 inline-block rounded-full border border-moss/40 bg-fern/40 px-3 py-1 text-xs font-medium uppercase tracking-wider text-moss">
              {t.home.badge}
            </p>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              {t.home.title1}
              <br />
              <span className="text-moss">{t.home.title2}</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-lime/70">{t.home.lead}</p>
            <PlainThemeButton on={isPlainTheme(cookieStore.get(PLAIN_THEME_COOKIE)?.value)} />
            {!user && (
              <p className="mt-6 text-sm muted">
                {t.home.cta.before}
                <Link href="/signup" className={link}>
                  {t.home.cta.signup}
                </Link>
                {t.home.cta.middle}
                <Link href="/login" className={link}>
                  {t.home.cta.login}
                </Link>
                {t.home.cta.after}
              </p>
            )}
          </div>
        }
        after={
          <section className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {t.home.features.map((f) => (
              <div key={f.title} className="card p-5">
                <h3 className="font-semibold text-lime">{f.title}</h3>
                <p className="mt-2 text-sm muted">{f.body}</p>
              </div>
            ))}
          </section>
        }
      />
    </div>
  );
}
