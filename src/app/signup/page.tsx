import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { AuthForm } from '@/components/auth/AuthForm';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Sign up' };

export default async function Page() {
    if (await getCurrentUser()) redirect('/');
    return (
        <div className="mx-auto max-w-md px-4 py-10 sm:py-16">
            <Suspense>
                <AuthForm mode="signup" />
            </Suspense>
        </div>
    );
}
