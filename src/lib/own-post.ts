import { getCurrentUser } from '@/lib/auth';
import { jsonError } from '@/lib/http';
import { prisma } from '@/lib/prisma';

/** Checks that the signed-in user wrote post `id`; `error` is the response to send otherwise. */
export async function ownPost(id: string) {
    const me = await getCurrentUser();
    if (!me) return { error: jsonError('loginRequired', 401) };
    const post = await prisma.post.findUnique({ where: { id }, select: { authorId: true } });
    if (!post) return { error: jsonError('postNotFound', 404) };
    if (post.authorId !== me.id) return { error: jsonError('notYourPost', 403) };
    return { error: null };
}
