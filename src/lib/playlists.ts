import { prisma } from "@/lib/prisma";
import type { ImportablePlaylist } from "@/lib/playlist-types";

const select = {
  id: true,
  title: true,
  author: { select: { username: true } },
  scenario: { select: { name: true, writer: true } },
  tracks: {
    orderBy: { position: "asc" },
    select: { videoId: true, title: true, channel: true, thumbnail: true, durationSec: true },
  },
} as const;

type Row = { id: string; title: string; author: { username: string }; scenario: ImportablePlaylist["scenario"]; tracks: ImportablePlaylist["tracks"] };
const toPlaylist = (p: Row): ImportablePlaylist => ({ ...p, author: p.author.username });

/** A user's liked posts, most recently liked first. */
export async function likedPlaylists(userId: string, take = 100): Promise<ImportablePlaylist[]> {
  const likes = await prisma.postLike.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    select: { post: { select } },
  });
  return likes.map((l) => toPlaylist(l.post));
}
