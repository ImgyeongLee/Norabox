import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { PostEditor } from '@/components/forum/PostEditor';
import { getCurrentUser } from '@/lib/auth';
import { getI18n } from '@/i18n/server';
import { prisma } from '@/lib/prisma';

export async function generateMetadata(): Promise<Metadata> {
    const { t } = await getI18n();
    return { title: t.meta.editPost };
}

export default async function EditPostPage(props: PageProps<'/forum/[id]/edit'>) {
    const { id } = await props.params;
    const [user, { t }] = await Promise.all([getCurrentUser(), getI18n()]);
    if (!user) redirect(`/login?next=/forum/${id}/edit`);
    const post = await prisma.post.findUnique({
        where: { id },
        include: { scenario: true, tracks: { orderBy: { position: 'asc' } } },
    });
    if (!post) notFound();
    if (post.authorId !== user.id) redirect(`/forum/${id}`);

    return (
        <div className="mx-auto max-w-4xl px-4 py-10">
            <h1 className="mb-6 text-3xl font-bold">{t.editor.editTitle}</h1>
            <PostEditor
                initial={{
                    id: post.id,
                    title: post.title,
                    scenario: post.scenario?.name ?? '',
                    writer: post.scenario?.writer ?? '',
                    tracks: post.tracks.map(({ videoId, title, channel, thumbnail, durationSec, description }) => ({
                        videoId,
                        title,
                        channel,
                        thumbnail,
                        durationSec,
                        description: description ?? '',
                    })),
                }}
            />
        </div>
    );
}
