import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { getI18n } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
    const { t } = await getI18n();
    return { title: t.meta.forgotPassword };
}

export default function Page() {
    return (
        <div className="mx-auto max-w-md px-4 py-10 sm:py-16">
            <ForgotPasswordForm />
        </div>
    );
}
