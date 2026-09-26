import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PostEditor } from '@/components/forum/PostEditor';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Share a playlist' };

export default async function NewPostPage() {
    if (!(await getCurrentUser())) redirect('/login?next=/forum/new');
    return (
        <div className="mx-auto max-w-4xl px-4 py-10">
            <h1 className="mb-6 text-3xl font-bold">Share a playlist</h1>
            <PostEditor />
        </div>
    );
}
