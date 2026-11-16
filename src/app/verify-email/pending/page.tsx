import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PendingVerification } from '@/components/auth/PendingVerification';
import { getI18n } from '@/i18n/server';
import { getCurrentUser, getPendingUser } from '@/lib/auth';
import { emailQuotaRetryAt } from '@/lib/email';

export async function generateMetadata(): Promise<Metadata> {
    const { t } = await getI18n();
    return { title: t.meta.verifyEmail };
}

// After signing up (or trying to log in before confirming), until the link in the email is opened.
export default async function Page() {
    if (await getCurrentUser()) redirect('/');
    const [{ t }, pending] = await Promise.all([getI18n(), getPendingUser()]);
    if (!pending) redirect('/login');
    const quotaRetryAt = pending.emailVerifiedAt ? null : await emailQuotaRetryAt();
    return (
        <div className="mx-auto max-w-md px-4 py-10 sm:py-16">
            {pending.emailVerifiedAt ? (
                <div className="card p-6 sm:p-8">
                    <h1 className="text-2xl font-bold">{t.verify.okTitle}</h1>
                    <p className="mt-2 text-sm muted">{t.verify.alreadyDone}</p>
                    <Link href="/login" className="btn-primary mt-6 w-full">
                        {t.verify.toLogin}
                    </Link>
                </div>
            ) : (
                <PendingVerification
                    email={pending.email}
                    sent={pending.verifyEmailSentAt !== null}
                    quotaRetryAt={quotaRetryAt?.toISOString() ?? null}
                />
            )}
        </div>
    );
}
