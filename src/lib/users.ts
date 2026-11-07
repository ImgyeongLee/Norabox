import { avatarUrlFor } from "@/lib/avatar";

// Account status. Deleting an account now removes its row; status "deleted" only remains on
// accounts deleted before that, whose forum posts show the author as "Deleted user".
export const USER_ACTIVE = "active";
export const USER_DELETED = "deleted";

/** Prisma `select` for showing a post's author. */
export const authorSelect = { id: true, username: true, avatarMime: true, updatedAt: true, status: true } as const;

type Author = { id: string; username: string; avatarMime: string | null; updatedAt: Date; status: string };

/**
 * Display info for a post's author. `name` is null for an anonymous post (show "Anonymous") or a
 * deleted account (show "Deleted user"); neither shows a picture, whose URL holds the user's id.
 */
export function authorView(author: Author, anonymous: boolean) {
  if (anonymous) return { name: null, avatarUrl: null, anonymous };
  if (author.status === USER_DELETED) return { name: null, avatarUrl: null, anonymous };
  return { name: author.username, avatarUrl: avatarUrlFor(author), anonymous };
}

/** The name a room or the Library tab credits for a post: none when anonymous or deleted. */
export const authorName = (author: { username: string; status: string }, anonymous: boolean) =>
  anonymous || author.status === USER_DELETED ? null : author.username;
