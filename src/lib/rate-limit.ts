import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Attempt limits per IP address, counted in Upstash Redis: serverless functions don't remember
// anything between requests, so the counts live there. Works without Redis (local dev): no limits.

// Names set by Upstash, or by Vercel's Upstash integration.
const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

// Generous, since people at a school or café can share one IP. Logins are also limited per
// account (src/lib/login.ts).
const limiters = redis && {
    signup: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 h'), prefix: 'norabox:rl:signup' }),
    login: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, '10 m'), prefix: 'norabox:rl:login' }),
};

/**
 * Whether this IP may make another `action` attempt now. Always yes without Redis, and also if
 * Redis can't be reached: an outage there shouldn't lock everyone out of their account.
 */
export async function allowAttempt(action: 'signup' | 'login', ip: string) {
    if (!limiters) return true;
    try {
        return (await limiters[action].limit(ip)).success;
    } catch (e) {
        console.error('[rate-limit] check failed', e);
        return true;
    }
}

/** The visitor's IP address. On Vercel, x-forwarded-for is set by Vercel itself, so it can be trusted. */
export function clientIp(req: Request) {
    return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}
