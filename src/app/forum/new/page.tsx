import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PostEditor } from '@/components/forum/PostEditor';
import { getCurrentUser } from '@/lib/auth';
import { getI18n } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
    const { t } = await getI18n();
    return { title: t.meta.newPost };
}

export default async function NewPostPage() {
    const [user, { t }] = await Promise.all([getCurrentUser(), getI18n()]);
    if (!user) redirect('/login?next=/forum/new');
    return (
        <div className="mx-auto max-w-4xl px-4 py-10">
            <h1 className="text-3xl font-bold">{t.editor.newTitle}</h1>
            <p className="mb-6 mt-1 text-lime/60">{t.editor.newLead}</p>
            <PostEditor />
        </div>
    );
}
