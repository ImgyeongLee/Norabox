// Client-safe visibility constants (post-access.ts uses node:crypto, so it stays server-only).
export const VISIBILITY_OPTIONS = ["private", "unlisted", "public"] as const;
export type Visibility = (typeof VISIBILITY_OPTIONS)[number];
