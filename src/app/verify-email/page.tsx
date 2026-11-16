import type { Metadata } from 'next';
import Link from 'next/link';
import { getI18n } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
    const { t } = await getI18n();
    return { title: t.meta.verifyEmail };
}

// Where the link in the verification email ends up (after /api/auth/verify-email checked it).
export default async function Page({ searchParams }: PageProps<'/verify-email'>) {
    const [{ t }, { status }] = await Promise.all([getI18n(), searchParams]);
    const ok = status === 'ok';
    return (
        <div className="mx-auto max-w-md px-4 py-10 sm:py-16">
            <div className="card p-6 sm:p-8">
                <h1 className="text-2xl font-bold">{ok ? t.verify.okTitle : t.verify.invalidTitle}</h1>
                <p className="mt-2 text-sm muted">{ok ? t.verify.okBody : t.verify.invalidBody}</p>
                <Link href="/" className="btn-primary mt-6 w-full">
                    {t.verify.continue}
                </Link>
            </div>
        </div>
    );
}
