import { Markdown } from '@/components/Markdown';
import { getI18n } from '@/i18n/server';

/**
 * A legal document (terms, privacy policy) written in Korean and English: Korean pages show the
 * Korean text, every other language the English one, with a note saying so.
 */
export async function LegalPage({ doc }: { doc: { ko: string; en: string } }) {
    const { locale, t } = await getI18n();
    return (
        <article className="mx-auto max-w-3xl px-4 py-10">
            {locale !== 'ko' && locale !== 'en' && <p className="mb-4 text-sm text-lime/55">{t.legal.available}</p>}
            <div className="card p-5 sm:p-8">
                <Markdown className="legal text-lime/85">{locale === 'ko' ? doc.ko : doc.en}</Markdown>
            </div>
        </article>
    );
}
