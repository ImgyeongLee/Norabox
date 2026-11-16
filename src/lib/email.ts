import nodemailer, { type Transporter } from 'nodemailer';
import { EMAIL_DAILY_LIMIT, EMAIL_QUOTA_RESET_UTC_HOUR } from '@/lib/limits';
import { redis } from '@/lib/rate-limit';

// Sends email through Brevo's SMTP relay (https://help.brevo.com/hc/en-us/articles/7924908994450).
// The free plan sends EMAIL_DAILY_LIMIT emails a day. Norabox counts its sends in Upstash Redis and
// stops at the limit, so people get "try again at …" instead of a silent failure; if Brevo refuses
// for lack of credits anyway (the count was lost, or the dashboard was used too), that counts as
// "limit reached" as well.
//
// Without the BREVO_* SMTP settings (local dev) emails are printed to the server console instead.

const HOUR = 60 * 60 * 1000;

export type Email = { to: string; subject: string; html: string; text: string; tag: string };
export type SendResult = { ok: true } | { ok: false; reason: 'quota'; retryAt: Date } | { ok: false; reason: 'failed' };

/** The day the email count belongs to (YYYY-MM-DD); a day starts at EMAIL_QUOTA_RESET_UTC_HOUR UTC. */
export const quotaDay = (now: Date) =>
    new Date(now.getTime() - EMAIL_QUOTA_RESET_UTC_HOUR * HOUR).toISOString().slice(0, 10);

/** When the daily count next starts over. */
export function nextQuotaReset(now: Date) {
    const reset = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), EMAIL_QUOTA_RESET_UTC_HOUR),
    );
    if (reset <= now) reset.setUTCDate(reset.getUTCDate() + 1);
    return reset;
}

const countKey = (now: Date) => `norabox:email:sent:${quotaDay(now)}`;
const COUNT_TTL_SEC = 2 * 24 * 60 * 60;

// Remembered by this server instance when Brevo itself says the quota is used up, so it doesn't
// keep asking (and also works without Redis).
let exhaustedUntil = 0;

/** When sending works again, if today's limit has been reached; null if emails can be sent now. */
export async function emailQuotaRetryAt(now = new Date()): Promise<Date | null> {
    if (now.getTime() < exhaustedUntil) return new Date(exhaustedUntil);
    if (!redis) return null;
    try {
        const sent = Number((await redis.get<number>(countKey(now))) ?? 0);
        return sent >= EMAIL_DAILY_LIMIT ? nextQuotaReset(now) : null;
    } catch (e) {
        console.error('[email] quota check failed', e);
        return null;
    }
}

/** Counts one send against today's limit; false when the limit is already reached. */
async function reserve(now: Date): Promise<boolean> {
    if (now.getTime() < exhaustedUntil) return false;
    if (!redis) return true;
    try {
        const key = countKey(now);
        const sent = await redis.incr(key);
        if (sent === 1) await redis.expire(key, COUNT_TTL_SEC);
        return sent <= EMAIL_DAILY_LIMIT;
    } catch (e) {
        // Redis down: let Brevo decide (it refuses past the quota, which is handled below).
        console.error('[email] quota count failed', e);
        return true;
    }
}

async function release(now: Date) {
    if (!redis) return;
    await redis.decr(countKey(now)).catch(() => {});
}

async function markExhausted(now: Date) {
    const retryAt = nextQuotaReset(now);
    exhaustedUntil = retryAt.getTime();
    if (redis) await redis.set(countKey(now), EMAIL_DAILY_LIMIT, { ex: COUNT_TTL_SEC }).catch(() => {});
    return retryAt;
}

/**
 * Whether Brevo's SMTP answer means the account has no sending credits left today. Brevo doesn't
 * document a dedicated code, so this looks at the reply text as well as the code.
 */
export function isQuotaError(responseCode: number | undefined, response: string | undefined) {
    if (!responseCode || responseCode < 400) return false;
    return /credit|quota|daily limit|sending limit|limit exceeded|too many messages/i.test(response ?? '');
}

let transport: Transporter | null = null;

/** The Brevo SMTP connection, or null when it isn't configured. */
function smtp() {
    const host = process.env.BREVO_SMTP_SERVER?.trim();
    const user = process.env.BREVO_LOGIN?.trim();
    const pass = process.env.BREVO_SMTP_KEY?.trim();
    if (!host || !user || !pass) return null;
    const port = Number(process.env.BREVO_PORT) || 587;
    transport ??= nodemailer.createTransport({
        host,
        port,
        // 465 is TLS from the start; 587 / 2525 upgrade with STARTTLS, which is then required.
        secure: port === 465,
        requireTLS: port !== 465,
        auth: { user, pass },
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 15_000,
    });
    return transport;
}

let warned = false;

export async function sendEmail(email: Email, now = new Date()): Promise<SendResult> {
    const mailer = smtp();
    const from = process.env.EMAIL_FROM?.trim();
    if (!mailer || !from) {
        if (process.env.NODE_ENV === 'production') {
            if (!warned) console.error('[email] BREVO_SMTP_* or EMAIL_FROM is not set: emails cannot be sent.');
            warned = true;
            return { ok: false, reason: 'failed' };
        }
        console.info(`[email] (not sent: SMTP not set up) to ${email.to}: ${email.subject}\n${email.text}`);
        return { ok: true };
    }

    if (!(await reserve(now))) return { ok: false, reason: 'quota', retryAt: nextQuotaReset(now) };

    try {
        await mailer.sendMail({
            from: { name: process.env.EMAIL_FROM_NAME?.trim() || 'Norabox', address: from },
            to: email.to,
            subject: email.subject,
            html: email.html,
            text: email.text,
            // Groups the emails by kind in Brevo's logs.
            headers: { 'X-Mailin-Tag': email.tag },
        });
        return { ok: true };
    } catch (e) {
        const { responseCode, response } = (e ?? {}) as { responseCode?: number; response?: string };
        if (isQuotaError(responseCode, response)) {
            console.warn('[email] Brevo quota reached', responseCode, response);
            return { ok: false, reason: 'quota', retryAt: await markExhausted(now) };
        }
        console.error('[email] sending failed', responseCode, response ?? e);
    }
    // Not sent, so it doesn't count.
    await release(now);
    return { ok: false, reason: 'failed' };
}
