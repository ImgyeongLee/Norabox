import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { PostEditor } from '@/components/forum/PostEditor';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Edit post' };

export default async function EditPostPage(props: PageProps<'/forum/[id]/edit'>) {
    const { id } = await props.params;
    const user = await getCurrentUser();
    if (!user) redirect(`/login?next=/forum/${id}/edit`);
    const post = await prisma.post.findUnique({
        where: { id },
        include: { tracks: { orderBy: { position: 'asc' } } },
    });
    if (!post) notFound();
    if (post.authorId !== user.id) redirect(`/forum/${id}`);

    return (
        <div className="mx-auto max-w-4xl px-4 py-10">
            <h1 className="mb-6 text-3xl font-bold">Edit post</h1>
            <PostEditor
                initial={{
                    id: post.id,
                    title: post.title,
                    description: post.description ?? '',
                    body: post.body ?? '',
                    tracks: post.tracks.map(({ videoId, title, channel, thumbnail, durationSec }) => ({
                        videoId,
                        title,
                        channel,
                        thumbnail,
                        durationSec,
                    })),
                }}
            />
        </div>
    );
}
