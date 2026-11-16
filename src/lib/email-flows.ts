import { NextResponse } from 'next/server';
import type { Prisma } from '@/generated/prisma/client';
import type { Messages } from '@/i18n/messages/en';
import { sendEmail } from '@/lib/email';
import { signResetToken, signVerifyToken } from '@/lib/email-tokens';
import { EMAIL_RESEND_COOLDOWN_SEC } from '@/lib/limits';
import { prisma } from '@/lib/prisma';

// The two emails Norabox sends: "confirm your email address" and "reset your password".

/** What the API tells the client; `retryAt` (ISO time) says when emails can be sent again. */
export type EmailOutcome =
    | { ok: true }
    | { ok: false; error: 'emailQuota'; retryAt: string }
    | { ok: false; error: 'emailCooldown' | 'emailFailed' };

type Kind = 'verify' | 'reset';
type Recipient = { id: string; username: string; email: string };

/** Conditions on / changes to the "last sent" time of this kind of email. */
const sentAtIs = (kind: Kind, v: Prisma.DateTimeNullableFilter | Date | null): Prisma.UserWhereInput =>
    kind === 'verify' ? { verifyEmailSentAt: v } : { resetEmailSentAt: v };
const setSentAt = (kind: Kind, v: Date | null): Prisma.UserUpdateManyMutationInput =>
    kind === 'verify' ? { verifyEmailSentAt: v } : { resetEmailSentAt: v };

/** Where links in emails point: APP_URL (the site's own domain) or else the address this request came to. */
export function appOrigin(req: Request) {
    const configured = process.env.APP_URL?.trim().replace(/\/+$/, '');
    return configured || new URL(req.url).origin;
}

const escapeHtml = (s: string) =>
    s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/**
 * Builds the email: a plain-text version plus a simple HTML one.
 *
 * The link is plain text, never an <a> tag: Brevo rewrites every <a href> to go through its
 * click-tracking domain (r.send.norabox.app), which has no valid HTTPS certificate, and .app
 * domains only open over HTTPS. Mail apps turn a plain URL into a link by themselves, and
 * that link goes straight to Norabox.
 */
export function renderEmail(kind: Kind, t: Messages, username: string, link: string) {
    const m = t.emails;
    const [subject, heading, body, expiry] =
        kind === 'verify'
            ? [m.verifySubject, m.verifyHeading, m.verifyBody(username), m.verifyExpiry]
            : [m.resetSubject, m.resetHeading, m.resetBody(username), m.resetExpiry];
    const text = [heading, '', body, '', link, '', m.linkHint, expiry, m.ignore].join('\n');
    const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f4f6ee;font-family:-apple-system,'Segoe UI',Roboto,'Apple SD Gothic Neo','Noto Sans JP',sans-serif;color:#132a13">
<table role="presentation" width="100%" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px">
<tr><td>
<p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#31572c">Norabox</p>
<h1 style="margin:0 0 12px;font-size:20px">${escapeHtml(heading)}</h1>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6">${escapeHtml(body)}</p>
<p style="margin:0 0 16px;padding:12px;background:#f4f6ee;border:1px solid #90a955;border-radius:8px;font-size:14px;line-height:1.5;word-break:break-all;color:#31572c">${escapeHtml(link)}</p>
<p style="margin:0 0 8px;font-size:13px;color:#555">${escapeHtml(m.linkHint)}</p>
<p style="margin:0 0 8px;font-size:13px;color:#555">${escapeHtml(expiry)}</p>
<p style="margin:16px 0 0;font-size:13px;color:#555">${escapeHtml(m.ignore)}</p>
</td></tr></table></body></html>`;
    return { subject, html, text };
}

async function sendLinkEmail(kind: Kind, user: Recipient, link: string, t: Messages, now: Date): Promise<EmailOutcome> {
    const before = await prisma.user.findUnique({
        where: { id: user.id },
        select: { verifyEmailSentAt: true, resetEmailSentAt: true },
    });
    const previous = (kind === 'verify' ? before?.verifyEmailSentAt : before?.resetEmailSentAt) ?? null;
    // One send per cooldown per account, checked and claimed in one update so parallel clicks
    // can't both send.
    const cutoff = new Date(now.getTime() - EMAIL_RESEND_COOLDOWN_SEC * 1000);
    const claimed = await prisma.user.updateMany({
        where: { id: user.id, OR: [sentAtIs(kind, null), sentAtIs(kind, { lt: cutoff })] },
        data: setSentAt(kind, now),
    });
    if (claimed.count === 0) return { ok: false, error: 'emailCooldown' };

    const result = await sendEmail({ to: user.email, tag: kind, ...renderEmail(kind, t, user.username, link) }, now);
    if (result.ok) return { ok: true };

    // Not sent: put the previous time back, so "we sent you a link" isn't shown and they can retry.
    await prisma.user.updateMany({ where: { id: user.id, ...sentAtIs(kind, now) }, data: setSentAt(kind, previous) });
    return result.reason === 'quota'
        ? { ok: false, error: 'emailQuota', retryAt: result.retryAt.toISOString() }
        : { ok: false, error: 'emailFailed' };
}

/** Emails a link that confirms `user.email` belongs to them. */
export async function sendVerificationEmail(user: Recipient, t: Messages, origin: string, now = new Date()) {
    const token = await signVerifyToken(user.id, user.email);
    const link = `${origin}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
    return sendLinkEmail('verify', user, link, t, now);
}

/** Emails a link to a page where they choose a new password (which also unlocks a locked account). */
export async function sendPasswordResetEmail(
    user: Recipient & { passwordHash: string },
    t: Messages,
    origin: string,
    now = new Date(),
) {
    const token = await signResetToken(user.id, user.passwordHash);
    const link = `${origin}/api/auth/password-reset?token=${encodeURIComponent(token)}`;
    return sendLinkEmail('reset', user, link, t, now);
}

/** The API answer for an email that wasn't sent. */
export function emailErrorResponse(outcome: Exclude<EmailOutcome, { ok: true }>) {
    const status = outcome.error === 'emailFailed' ? 502 : 429;
    return NextResponse.json(
        { error: outcome.error, retryAt: outcome.error === 'emailQuota' ? outcome.retryAt : undefined },
        { status },
    );
}
