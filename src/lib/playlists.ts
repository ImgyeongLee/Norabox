import { listableFor } from "@/lib/post-access";
import { prisma } from "@/lib/prisma";
import type { ImportablePlaylist } from "@/lib/playlist-types";
import { USER_DELETED } from "@/lib/users";

const select = {
  id: true,
  title: true,
  author: { select: { username: true, status: true } },
  scenario: { select: { name: true, writer: true } },
  tracks: {
    orderBy: { position: "asc" },
    select: { id: true, videoId: true, title: true, channel: true, thumbnail: true, durationSec: true, memo: true },
  },
} as const;

type Row = {
  id: string;
  title: string;
  author: { username: string; status: string };
  scenario: ImportablePlaylist["scenario"];
  tracks: ImportablePlaylist["tracks"];
};
const toPlaylist = (p: Row): ImportablePlaylist => ({
  ...p,
  author: p.author.status === USER_DELETED ? null : p.author.username,
});

/** A user's liked posts, most recently liked first. */
export async function likedPlaylists(userId: string, take = 100): Promise<ImportablePlaylist[]> {
  const likes = await prisma.postLike.findMany({
    // A liked post that its author later made private drops out of the list.
    where: { userId, post: listableFor(userId) },
    orderBy: { createdAt: "desc" },
    take,
    select: { post: { select } },
  });
  return likes.map((l) => toPlaylist(l.post));
}

/** A user's own playlists (every visibility), most recently edited first. */
export async function ownPlaylists(userId: string, take = 100): Promise<ImportablePlaylist[]> {
  const posts = await prisma.post.findMany({
    where: { authorId: userId },
    orderBy: { updatedAt: "desc" },
    take,
    select,
  });
  return posts.map(toPlaylist);
}
