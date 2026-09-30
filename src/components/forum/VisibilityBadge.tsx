import type { IconType } from 'react-icons';
import { LuGlobe, LuLink, LuLock } from 'react-icons/lu';
import { Icon } from '@/components/icons';
import type { Visibility } from '@/lib/visibility';
import type { Messages } from '@/i18n/messages';

const STYLE: Record<Visibility, string> = {
    private: 'border-leaf/60 bg-pine/70 text-lime/75',
    unlisted: 'border-moss/60 bg-moss/15 text-moss',
    public: 'border-lime/50 bg-lime/15 text-lime',
};
const ICON: Record<Visibility, IconType> = { private: LuLock, unlisted: LuLink, public: LuGlobe };

/** Small pill showing who can see a playlist. Pass the dictionary (works in server and client components). */
export function VisibilityBadge({ visibility, t }: { visibility: string; t: Messages }) {
    const v = (visibility in STYLE ? visibility : 'private') as Visibility;
    return (
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STYLE[v]}`}>
            <Icon as={ICON[v]} className="size-3" />
            {t.visibility[v]}
        </span>
    );
}
