import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/LegalPage';
import { getI18n } from '@/i18n/server';
import { privacy } from '@/legal/privacy';

export async function generateMetadata(): Promise<Metadata> {
    const { t } = await getI18n();
    return { title: t.meta.privacy };
}

export default function PrivacyPage() {
    return <LegalPage doc={privacy} />;
}
