import type { Metadata } from 'next';
import Link from 'next/link';
import { LuMegaphone } from 'react-icons/lu';
import { Icon } from '@/components/icons';
import { getCurrentUser } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { getI18n } from '@/i18n/server';
import { prisma } from '@/lib/prisma';
import { isSiteAdmin } from '@/lib/site-admin';

export async function generateMetadata(): Promise<Metadata> {
    const { t } = await getI18n();
    return { title: t.meta.announcements };
}

/** The announcements board: newest first, everyone can read it; site admins also get "New announcement". */
export default async function AnnouncementsPage() {
    const [{ t, locale }, user, announcements] = await Promise.all([
        getI18n(),
        getCurrentUser(),
        prisma.announcement.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100,
            select: { id: true, title: true, createdAt: true },
        }),
    ]);

    return (
        <div className="mx-auto max-w-3xl px-4 py-10">
            <div className="flex flex-wrap items-end gap-4">
                <div>
                    <h1 className="flex items-center gap-2 text-3xl font-bold">
                        <Icon as={LuMegaphone} className="size-7 text-moss" />
                        {t.announcements.title}
                    </h1>
                    <p className="mt-1 text-lime/60">{t.announcements.lead}</p>
                </div>
                {isSiteAdmin(user) && (
                    <Link href="/announcements/new" className="btn-primary ml-auto">
                        {t.announcements.new}
                    </Link>
                )}
            </div>

            {announcements.length === 0 ? (
                <p className="mt-16 text-center text-lime/55">{t.announcements.empty}</p>
            ) : (
                <ul className="card mt-8 divide-y divide-leaf/25 overflow-hidden">
                    {announcements.map((a) => (
                        <li key={a.id}>
                            <Link
                                href={`/announcements/${a.id}`}
                                className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-4 transition hover:bg-fern/40 sm:px-5"
                            >
                                <span className="min-w-0 flex-1 font-semibold leading-snug">{a.title}</span>
                                <time dateTime={a.createdAt.toISOString()} className="shrink-0 text-sm text-lime/50">
                                    {formatDate(a.createdAt, locale)}
                                </time>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
