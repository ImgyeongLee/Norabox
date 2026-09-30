import { randomBytes, timingSafeEqual } from "node:crypto";

// Who can see a playlist (forum post):
//   private  – only its author
//   unlisted – its author, and anyone with the share link /s/<shareToken>
//   public   – everyone; listed on the forum
// The post's own URL (/forum/<id>) never unlocks an unlisted post for others.

export { VISIBILITY_OPTIONS as VISIBILITIES, type Visibility } from "@/lib/visibility";

export const newShareToken = () => randomBytes(18).toString("base64url");

const sameToken = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

type AccessInfo = { authorId: string; visibility: string; shareToken: string };

export function canViewPost(post: AccessInfo, viewerId: string | null | undefined, shareToken?: string | null) {
  if (post.visibility === "public") return true;
  if (viewerId && post.authorId === viewerId) return true;
  return post.visibility === "unlisted" && !!shareToken && sameToken(shareToken, post.shareToken);
}

/** Prisma filter for posts that may appear in a viewer's lists (e.g. their liked playlists):
 *  public, unlisted (they reached it through its link), or their own. */
export const listableFor = (viewerId: string) => ({
  OR: [{ visibility: { in: ["public", "unlisted"] } }, { authorId: viewerId }],
});

/** Where a card/link should point: the post URL, or the share link for someone else's unlisted post. */
export function postHref(post: { id: string } & AccessInfo, viewerId: string | null | undefined) {
  if (post.visibility === "unlisted" && post.authorId !== viewerId) return `/s/${post.shareToken}`;
  return `/forum/${post.id}`;
}
