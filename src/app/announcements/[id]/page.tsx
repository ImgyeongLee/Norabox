import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { LuArrowLeft } from 'react-icons/lu';
import { DeleteAnnouncementButton } from '@/components/announcements/DeleteAnnouncementButton';
import { Icon } from '@/components/icons';
import { Markdown } from '@/components/Markdown';
import { getCurrentUser } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { getI18n } from '@/i18n/server';
import { prisma } from '@/lib/prisma';
import { isSiteAdmin } from '@/lib/site-admin';

const getAnnouncement = cache((id: string) => prisma.announcement.findUnique({ where: { id } }));

export async function generateMetadata(props: PageProps<'/announcements/[id]'>): Promise<Metadata> {
    const announcement = await getAnnouncement((await props.params).id);
    return announcement ? { title: announcement.title } : {};
}

export default async function AnnouncementPage(props: PageProps<'/announcements/[id]'>) {
    const { id } = await props.params;
    const [announcement, user, { t, locale }] = await Promise.all([getAnnouncement(id), getCurrentUser(), getI18n()]);
    if (!announcement) notFound();
    const edited = announcement.updatedAt.getTime() - announcement.createdAt.getTime() > 60_000;

    return (
        <article className="mx-auto max-w-3xl px-4 py-10">
            <Link href="/announcements" className="inline-flex items-center gap-1 text-sm text-lime/60 hover:text-lime">
                <Icon as={LuArrowLeft} className="size-4" />
                {t.announcements.back}
            </Link>
            <header className="mt-4 flex flex-wrap items-end gap-3">
                <div className="min-w-0 flex-1">
                    <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">{announcement.title}</h1>
                    <p className="mt-2 text-sm text-lime/55">
                        <time dateTime={announcement.createdAt.toISOString()}>
                            {formatDate(announcement.createdAt, locale)}
                        </time>
                        {edited && ` · ${t.announcements.edited}`}
                    </p>
                </div>
                {isSiteAdmin(user) && (
                    <div className="flex gap-2">
                        <Link href={`/announcements/${announcement.id}/edit`} className="btn-secondary px-3 py-2">
                            {t.announcements.edit}
                        </Link>
                        <DeleteAnnouncementButton id={announcement.id} />
                    </div>
                )}
            </header>
            <div className="card mt-6 p-5 sm:p-6">
                <Markdown className="text-lime/85">{announcement.body}</Markdown>
            </div>
        </article>
    );
}
