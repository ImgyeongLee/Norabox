import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PostEditor } from '@/components/forum/PostEditor';
import { getI18n } from '@/i18n/server';
import { getCurrentUser } from '@/lib/auth';
import { VISIBILITIES, type Visibility } from '@/lib/post-access';

export async function generateMetadata(): Promise<Metadata> {
    const { t } = await getI18n();
    return { title: t.meta.newPlaylist };
}

/** New playlist. Private by default; the forum's "Share a playlist" button preselects Public. */
export default async function NewPlaylistPage(props: PageProps<'/playlists/new'>) {
    const [user, { t }, sp] = await Promise.all([getCurrentUser(), getI18n(), props.searchParams]);

    if (!user) redirect('/login?next=/playlists/new');

    const visibility: Visibility = VISIBILITIES.includes(sp.visibility as Visibility)
        ? (sp.visibility as Visibility)
        : 'private';
    return (
        <div className="mx-auto max-w-4xl px-4 py-10">
            <h1 className="text-3xl font-bold">{t.editor.newTitle}</h1>
            <p className="mb-6 mt-1 muted">{t.editor.newLead}</p>
            <PostEditor defaultVisibility={visibility} />
        </div>
    );
}
