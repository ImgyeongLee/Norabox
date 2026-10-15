// Cloudflare Turnstile (bot check) on sign-up and log-in. The widget in the form puts a one-time
// token in the "cf-turnstile-response" field; the server asks Cloudflare whether it's valid.
// Off when TURNSTILE_SECRET_KEY isn't set (local dev).

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

let warned = false;

/** Whether `token` (from the request body) proves a person passed the check. */
export async function verifyTurnstile(token: unknown, ip: string): Promise<boolean> {
    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
        if (process.env.NODE_ENV === 'production' && !warned) {
            warned = true;
            console.warn('[turnstile] TURNSTILE_SECRET_KEY is not set: sign-up and log-in have no bot check.');
        }
        return true;
    }
    if (typeof token !== 'string' || !token || token.length > 2048) return false;
    try {
        const res = await fetch(VERIFY_URL, {
            method: 'POST',
            body: new URLSearchParams({ secret, response: token, ...(ip !== 'unknown' ? { remoteip: ip } : {}) }),
        });
        const data = (await res.json()) as { success?: boolean };
        return data.success === true;
    } catch (e) {
        // If Cloudflare can't be reached, refuse: letting everyone through would let bots in too.
        console.error('[turnstile] verification failed', e);
        return false;
    }
}

/** The token from a JSON request body. */
export const turnstileToken = (body: unknown) =>
    body && typeof body === 'object' ? (body as Record<string, unknown>)['cf-turnstile-response'] : undefined;
