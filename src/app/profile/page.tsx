import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AvatarForm, PasswordForm, UsernameForm } from '@/components/auth/ProfileForms';
import { getCurrentUser } from '@/lib/auth';
import { getI18n } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
    const { t } = await getI18n();
    return { title: t.meta.profile };
}

export default async function ProfilePage() {
    const [user, { t }] = await Promise.all([getCurrentUser(), getI18n()]);
    if (!user) redirect('/login?next=/profile');
    return (
        <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
            <div>
                <h1 className="text-3xl font-bold">{t.profile.title}</h1>
                <p className="mt-1 text-sm text-lime/60">{user.email}</p>
            </div>
            <AvatarForm username={user.username} avatarUrl={user.avatarUrl} />
            <UsernameForm username={user.username} />
            <PasswordForm />
        </div>
    );
}
