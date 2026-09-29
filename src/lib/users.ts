import { avatarUrlFor } from "@/lib/avatar";

// Account status. Deleting an account only sets status to "deleted"; the row stays
// so the user's forum posts keep working, shown with the author as "Deleted user".
export const USER_ACTIVE = "active";
export const USER_DELETED = "deleted";

/** Prisma `select` for showing a post's author. */
export const authorSelect = { id: true, username: true, avatarMime: true, updatedAt: true, status: true } as const;

type Author = { id: string; username: string; avatarMime: string | null; updatedAt: Date; status: string };

/** Display info for an author; `name` is null for deleted accounts (show "Deleted user", no picture). */
export function authorView(author: Author) {
  if (author.status === USER_DELETED) return { name: null, avatarUrl: null };
  return { name: author.username, avatarUrl: avatarUrlFor(author) };
}
