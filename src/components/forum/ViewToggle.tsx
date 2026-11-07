'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import type { IconType } from 'react-icons';
import { LuLayoutGrid, LuList } from 'react-icons/lu';
import { Icon } from '@/components/icons';
import { useI18n } from '@/i18n/client';
import { LIST_VIEW_COOKIE, type ListView } from '@/lib/list-view';

const OPTIONS: { view: ListView; icon: IconType }[] = [
    { view: 'card', icon: LuLayoutGrid },
    { view: 'list', icon: LuList },
];

const saveView = (v: ListView) => {
    document.cookie = `${LIST_VIEW_COOKIE}=${v}; path=/; max-age=${60 * 60 * 24 * 400}; samesite=lax`;
};

/** Cards or list for playlist pages; remembered for this browser in a cookie the pages read. */
export function ViewToggle({ view }: { view: ListView }) {
    const { t } = useI18n();
    const router = useRouter();
    const [pending, startTransition] = useTransition();

    function choose(v: ListView) {
        if (v === view) return;
        saveView(v);
        startTransition(() => router.refresh());
    }

    return (
        <div role="group" aria-label={t.listView.label} className="flex shrink-0 gap-1 rounded-xl bg-pine/60 p-1">
            {OPTIONS.map(({ view: v, icon }) => (
                <button
                    key={v}
                    type="button"
                    onClick={() => choose(v)}
                    disabled={pending}
                    aria-pressed={view === v}
                    title={t.listView[v]}
                    aria-label={t.listView[v]}
                    className={`icon-btn size-8 transition ${view === v ? 'bg-moss text-pine' : 'text-lime/60 hover:text-lime'}`}>
                    <Icon as={icon} className="size-4" />
                </button>
            ))}
        </div>
    );
}
