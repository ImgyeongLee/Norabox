import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPostById, PostView, postMetadata } from '@/components/forum/PostView';
import { getCurrentUser } from '@/lib/auth';
import { canViewPost } from '@/lib/post-access';

/** The post's own URL: public playlists for everyone; private and link-only ones for their author only. */
async function load(id: string) {
    const [post, user] = await Promise.all([getPostById(id), getCurrentUser()]);
    return { post: post && canViewPost(post, user?.id) ? post : null, user };
}

export async function generateMetadata(props: PageProps<'/forum/[id]'>): Promise<Metadata> {
    const { post } = await load((await props.params).id);
    return post ? postMetadata(post) : {};
}

export default async function PostPage(props: PageProps<'/forum/[id]'>) {
    const { post, user } = await load((await props.params).id);
    if (!post) notFound();
    return <PostView post={post} user={user} />;
}
