import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { AnnouncementEditor } from '@/components/announcements/AnnouncementEditor';
import { getCurrentUser } from '@/lib/auth';
import { getI18n } from '@/i18n/server';
import { prisma } from '@/lib/prisma';
import { isSiteAdmin } from '@/lib/site-admin';

export async function generateMetadata(): Promise<Metadata> {
    const { t } = await getI18n();
    return { title: t.meta.editAnnouncement };
}

export default async function EditAnnouncementPage(props: PageProps<'/announcements/[id]/edit'>) {
    const { id } = await props.params;
    const [user, { t }] = await Promise.all([getCurrentUser(), getI18n()]);
    if (!user) redirect(`/login?next=/announcements/${id}/edit`);
    if (!isSiteAdmin(user)) notFound();
    const announcement = await prisma.announcement.findUnique({
        where: { id },
        select: { id: true, title: true, body: true },
    });
    if (!announcement) notFound();
    return (
        <div className="mx-auto max-w-3xl px-4 py-10">
            <h1 className="mb-6 text-3xl font-bold">{t.announcements.editTitle}</h1>
            <AnnouncementEditor initial={announcement} />
        </div>
    );
}
