import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { AnnouncementEditor } from '@/components/announcements/AnnouncementEditor';
import { getCurrentUser } from '@/lib/auth';
import { getI18n } from '@/i18n/server';
import { isSiteAdmin } from '@/lib/site-admin';

export async function generateMetadata(): Promise<Metadata> {
    const { t } = await getI18n();
    return { title: t.meta.newAnnouncement };
}

export default async function NewAnnouncementPage() {
    const [user, { t }] = await Promise.all([getCurrentUser(), getI18n()]);
    if (!user) redirect('/login?next=/announcements/new');
    if (!isSiteAdmin(user)) notFound();
    return (
        <div className="mx-auto max-w-3xl px-4 py-10">
            <h1 className="mb-6 text-3xl font-bold">{t.announcements.newTitle}</h1>
            <AnnouncementEditor />
        </div>
    );
}
