import { getCurrentUser } from '@/lib/auth';
import { jsonError } from '@/lib/http';
import { isSiteAdmin } from '@/lib/site-admin';

/** For announcement API routes: `error` is the response to send unless a site admin is signed in. */
export async function requireSiteAdmin() {
    const me = await getCurrentUser();
    if (!me) return { error: jsonError('loginRequired', 401) };
    if (!isSiteAdmin(me)) return { error: jsonError('siteAdminOnly', 403) };
    return { error: null };
}
