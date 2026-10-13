import Link from "next/link";
import { CreateRoomForm, JoinRoomForm } from "@/components/home/RoomForms";
import { getCurrentUser } from "@/lib/auth";
import { getI18n } from "@/i18n/server";
import { canViewPost } from "@/lib/post-access";
import { prisma } from "@/lib/prisma";

/** The forum post named by `?import=<postId>` (from a post's Import button), if it exists. */
async function importingPlaylist(id: unknown, shareToken: unknown, viewerId: string | undefined) {
  if (typeof id !== "string" || !/^[a-z0-9]{10,40}$/.test(id)) return null;
  const token = typeof shareToken === "string" ? shareToken : null;
  const post = await prisma.post.findUnique({
    where: { id },
    select: {
      id: true,
      authorId: true,
      visibility: true,
      shareToken: true,
      title: true,
      scenario: { select: { name: true } },
      tracks: { orderBy: { position: "asc" }, take: 1, select: { thumbnail: true } },
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

export default async function Home(props: PageProps<"/">) {
  const { import: importId, s: shareToken } = await props.searchParams;
  const [user, { t }] = await Promise.all([getCurrentUser(), getI18n()]);
  const importing = await importingPlaylist(importId, shareToken, user?.id);
  const link = "font-semibold text-moss underline-offset-4 hover:underline";
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
      <section className="grid items-start gap-10 lg:grid-cols-[1.1fr_1fr]">
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

        <div id="start-room" className={`card scroll-mt-24 space-y-6 p-5 sm:p-7 ${importing ? "border-moss/70" : ""}`}>
          <div>
            <h2 className="mb-4 text-xl font-bold">{t.home.startRoom}</h2>
            <CreateRoomForm importing={importing} />
          </div>
          <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-lime/40">
            <span className="h-px flex-1 bg-leaf/40" /> {t.home.or} <span className="h-px flex-1 bg-leaf/40" />
          </div>
          <div>
            <h2 className="mb-4 text-xl font-bold">{t.home.joinFriend}</h2>
            <JoinRoomForm />
          </div>
        </div>
      </section>

      <section className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {t.home.features.map((f) => (
          <div key={f.title} className="card p-5">
            <h3 className="font-semibold text-lime">{f.title}</h3>
            <p className="mt-2 text-sm muted">{f.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
