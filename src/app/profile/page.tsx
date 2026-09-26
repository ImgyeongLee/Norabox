import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AvatarForm, PasswordForm, UsernameForm } from '@/components/auth/ProfileForms';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Profile' };

export default async function ProfilePage() {
    const user = await getCurrentUser();
    if (!user) redirect('/login?next=/profile');
    return (
        <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
            <div>
                <h1 className="text-3xl font-bold">Profile</h1>
                <p className="mt-1 text-sm text-lime/60">{user.email}</p>
            </div>
            <AvatarForm username={user.username} avatarUrl={user.avatarUrl} />
            <UsernameForm username={user.username} />
            <PasswordForm />
        </div>
    );
}
