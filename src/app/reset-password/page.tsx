import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { getI18n } from '@/i18n/server';
import { RESET_COOKIE, resetTarget } from '@/lib/password-reset';

export async function generateMetadata(): Promise<Metadata> {
    const { t } = await getI18n();
    return { title: t.meta.resetPassword };
}

// Reached through the link in the reset email (/api/auth/password-reset), which leaves its token
// in a cookie. Without a working one, explain and offer a new link.
export default async function Page() {
    const [{ t }, store] = await Promise.all([getI18n(), cookies()]);
    const valid = await resetTarget(store.get(RESET_COOKIE)?.value);
    return (
        <div className="mx-auto max-w-md px-4 py-10 sm:py-16">
            {valid ? (
                <ResetPasswordForm />
            ) : (
                <div className="card p-6 sm:p-8">
                    <h1 className="text-2xl font-bold">{t.reset.invalidTitle}</h1>
                    <p className="mt-2 text-sm muted">{t.reset.invalidBody}</p>
                    <Link href="/forgot-password" className="btn-primary mt-6 w-full">
                        {t.reset.requestNew}
                    </Link>
                </div>
            )}
        </div>
    );
}
