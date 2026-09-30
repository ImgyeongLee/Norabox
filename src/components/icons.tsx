// App icons, from react-icons' Lucide set so every icon shares one line style.
// Components take normal SVG props; default size is 1.25rem (Tailwind size-5).
import type { IconBaseProps, IconType } from 'react-icons';
import {
    LuGripVertical,
    LuPause,
    LuPlay,
    LuRepeat,
    LuRepeat1,
    LuSkipBack,
    LuSkipForward,
    LuTrash2,
    LuVolume2,
    LuVolumeX,
} from 'react-icons/lu';

type P = IconBaseProps;

/** Renders a Lucide icon hidden from screen readers (the button around it carries the label). */
export function Icon({ as: Svg, className = 'size-5', ...p }: P & { as: IconType }) {
    return <Svg aria-hidden focusable="false" className={className} {...p} />;
}

// Transport controls are filled so they read clearly at small sizes.
export const PlayIcon = (p: P) => <Icon as={LuPlay} fill="currentColor" {...p} />;
export const PauseIcon = (p: P) => <Icon as={LuPause} fill="currentColor" {...p} />;
export const NextIcon = (p: P) => <Icon as={LuSkipForward} fill="currentColor" {...p} />;
export const PrevIcon = (p: P) => <Icon as={LuSkipBack} fill="currentColor" {...p} />;
export const RepeatIcon = ({ one, ...p }: P & { one?: boolean }) => <Icon as={one ? LuRepeat1 : LuRepeat} {...p} />;
export const VolumeIcon = ({ muted, ...p }: P & { muted?: boolean }) => <Icon as={muted ? LuVolumeX : LuVolume2} {...p} />;
export const GripIcon = (p: P) => <Icon as={LuGripVertical} {...p} />;
export const TrashIcon = (p: P) => <Icon as={LuTrash2} {...p} />;
