// Icons for post actions (Lucide, same style as icons.tsx).
import type { IconBaseProps } from 'react-icons';
import { LuHeart, LuImport, LuShare2 } from 'react-icons/lu';
import { Icon } from '@/components/icons';

type P = IconBaseProps;

export const HeartIcon = ({ filled, ...p }: P & { filled?: boolean }) => (
    <Icon as={LuHeart} fill={filled ? 'currentColor' : 'none'} {...p} />
);
export const ShareIcon = (p: P) => <Icon as={LuShare2} {...p} />;
export const ImportIcon = (p: P) => <Icon as={LuImport} {...p} />;
