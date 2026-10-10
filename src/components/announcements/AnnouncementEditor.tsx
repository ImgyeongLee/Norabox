'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { MarkdownEditor } from '@/components/MarkdownEditor';
import { useI18n } from '@/i18n/client';
import { MAX_ANNOUNCEMENT_BODY } from '@/lib/limits';
import { useJsonForm } from '@/lib/use-json-form';

type Initial = { id: string; title: string; body: string };

/** Writes a new announcement, or edits `initial` (site admins only; the API checks too). */
export function AnnouncementEditor({ initial }: { initial?: Initial }) {
    const router = useRouter();
    const { t, tError } = useI18n();
    const [title, setTitle] = useState(initial?.title ?? '');
    const [body, setBody] = useState(initial?.body ?? '');
    const { errors, busy, submit } = useJsonForm();

    async function onSubmit(e: React.SubmitEvent) {
        e.preventDefault();
        const res = await submit<{ id: string }>(
            initial ? `/api/announcements/${initial.id}` : '/api/announcements',
            { title, body },
            initial ? 'PATCH' : 'POST',
        );
        if (res) {
            router.push(`/announcements/${res.id}`);
            router.refresh();
        }
    }

    return (
        <form onSubmit={onSubmit} className="card space-y-5 p-5 sm:p-6" noValidate>
            <div>
                <label htmlFor="title" className="label">
                    {t.announcements.titleLabel}
                </label>
                <input
                    id="title"
                    className="input text-lg font-semibold"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={120}
                    placeholder={t.announcements.titlePlaceholder}
                    aria-invalid={!!errors.title}
                />
                {errors.title && <p className="field-error">{tError(errors.title)}</p>}
            </div>
            <div>
                <label htmlFor="body" className="label">
                    {t.announcements.body}
                </label>
                <MarkdownEditor id="body" value={body} onChange={setBody} maxLength={MAX_ANNOUNCEMENT_BODY} />
                {errors.body && <p className="field-error">{tError(errors.body)}</p>}
            </div>
            {errors.form && !errors.title && !errors.body && (
                <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                    {tError(errors.form)}
                </p>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" className="btn-ghost" onClick={() => router.back()}>
                    {t.common.cancel}
                </button>
                <button className="btn-primary" disabled={busy}>
                    {busy ? t.common.saving : initial ? t.announcements.save : t.announcements.publish}
                </button>
            </div>
        </form>
    );
}
