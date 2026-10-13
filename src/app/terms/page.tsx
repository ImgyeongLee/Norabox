import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/LegalPage';
import { getI18n } from '@/i18n/server';
import { terms } from '@/legal/terms';

export async function generateMetadata(): Promise<Metadata> {
    const { t } = await getI18n();
    return { title: t.meta.terms };
}

export default function TermsPage() {
    return <LegalPage doc={terms} />;
}
