import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPostByShareToken, PostView, postMetadata } from '@/components/forum/PostView';
import { getCurrentUser } from '@/lib/auth';
import { canViewPost } from '@/lib/post-access';

/** Share link for link-only ("partially public") playlists. Stops working if the author resets it or makes the playlist private. */
async function load(token: string) {
    const [post, user] = await Promise.all([getPostByShareToken(token), getCurrentUser()]);
    return { post: post && canViewPost(post, user?.id, token) ? post : null, user };
}

export async function generateMetadata(props: PageProps<'/s/[token]'>): Promise<Metadata> {
    const { post } = await load((await props.params).token);
    return post ? postMetadata(post) : {};
}

export default async function SharedPostPage(props: PageProps<'/s/[token]'>) {
    const { token } = await props.params;
    const { post, user } = await load(token);
    if (!post) notFound();
    return <PostView post={post} user={user} viaShareToken={token} />;
}
