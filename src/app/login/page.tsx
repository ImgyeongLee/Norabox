import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { AuthForm } from '@/components/auth/AuthForm';
import { getCurrentUser } from '@/lib/auth';
import { getI18n } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
    const { t } = await getI18n();
    return { title: t.meta.login };
}

export default async function Page() {
    if (await getCurrentUser()) redirect('/');
    return (
        <div className="mx-auto max-w-md px-4 py-10 sm:py-16">
            <Suspense>
                <AuthForm mode="login" />
            </Suspense>
        </div>
    );
}
