import type { CurrentUser } from "@/lib/auth";

/**
 * Site admins (who can write announcements) are listed by account email in SITE_ADMIN_EMAILS,
 * comma-separated. Emails are unique and can't be changed, so an account that already exists
 * can't be impersonated; list only emails that already have an account.
 */
export function isSiteAdmin(user: Pick<CurrentUser, "email"> | null | undefined) {
  if (!user) return false;
  const admins = (process.env.SITE_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(user.email.toLowerCase());
}
