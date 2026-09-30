'use client';

import type { IconType } from 'react-icons';
import { LuGlobe, LuLink, LuLock } from 'react-icons/lu';
import { Icon } from '@/components/icons';
import { useI18n } from '@/i18n/client';
import { VISIBILITY_OPTIONS, type Visibility } from '@/lib/visibility';

const ICON: Record<Visibility, IconType> = { private: LuLock, unlisted: LuLink, public: LuGlobe };

/** Radio cards for who can see a playlist: private, link only, or public. */
export function VisibilityPicker({ value, onChange }: { value: Visibility; onChange: (v: Visibility) => void }) {
    const { t } = useI18n();
    const hint: Record<Visibility, string> = {
        private: t.visibility.privateHint,
        unlisted: t.visibility.unlistedHint,
        public: t.visibility.publicHint,
    };
    return (
        <fieldset>
            <legend className="label">{t.visibility.label}</legend>
            <div className="grid gap-2 sm:grid-cols-3">
                {VISIBILITY_OPTIONS.map((v) => (
                    <label
                        key={v}
                        className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-3 transition ${
                            value === v ? 'border-moss bg-moss/15' : 'border-leaf/50 bg-pine/50 hover:border-leaf'
                        }`}
                    >
                        <span className="flex items-center gap-2 text-sm font-semibold">
                            <input
                                type="radio"
                                name="visibility"
                                value={v}
                                checked={value === v}
                                onChange={() => onChange(v)}
                                className="accent-[var(--color-moss)]"
                            />
                            <Icon as={ICON[v]} className="size-4 text-moss" />
                            {t.visibility[v]}
                        </span>
                        <span className="text-xs text-lime/60">{hint[v]}</span>
                    </label>
                ))}
            </div>
        </fieldset>
    );
}
