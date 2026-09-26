export const AVATAR_MAX_BYTES = 512 * 1024;
export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Public URL of a user's profile image; the version param busts caches after a change. */
export function avatarUrlFor(user: { id: string; avatarMime: string | null; updatedAt: Date }) {
  return user.avatarMime ? `/api/users/${user.id}/avatar?v=${user.updatedAt.getTime()}` : null;
}
