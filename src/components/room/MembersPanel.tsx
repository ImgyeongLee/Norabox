'use client';

import { LuLock, LuLockOpen } from 'react-icons/lu';
import { Icon } from '@/components/icons';
import { Avatar } from '@/components/Avatar';
import { useI18n } from '@/i18n/client';
import type { AckResult, MemberView, Role } from '@/lib/room-types';

const ROLE_STYLE: Record<Role, string> = {
    admin: 'bg-lime text-pine',
    dj: 'bg-moss text-pine',
    listener: 'bg-fern text-lime/80 border border-leaf/60',
};

export function RoleBadge({ role }: { role: Role }) {
    const { t } = useI18n();
    return (
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${ROLE_STYLE[role]}`}>
            {t.members.roles[role]}
        </span>
    );
}

type Props = {
    members: MemberView[];
    meId: string | null;
    isAdmin: boolean;
    setRole: (memberId: string, role: 'dj' | 'listener') => Promise<AckResult>;
    locked: boolean;
    /** Admin only: closes the room to newcomers, or opens it again. */
    setLocked: (locked: boolean) => Promise<AckResult>;
};

export function MembersPanel({ members, meId, isAdmin, setRole, locked, setLocked }: Props) {
    const { t } = useI18n();
    return (
        <div>
            {isAdmin && (
                <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-leaf/40 bg-pine/40 p-3">
                    <Icon as={locked ? LuLock : LuLockOpen} className={`size-5 shrink-0 ${locked ? 'text-moss' : 'text-lime/50'}`} />
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{t.access.title}</p>
                        <p className="text-xs text-lime/55">{locked ? t.access.closed : t.access.open}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setLocked(!locked)}
                        aria-pressed={locked}
                        className={`${locked ? 'btn-secondary' : 'btn-primary'} shrink-0 px-3 py-1.5 text-xs`}>
                        {locked ? t.access.reopen : t.access.close}
                    </button>
                </div>
            )}
            <p className="mb-3 text-xs text-lime/50">
                {t.members.hint} {isAdmin ? t.members.hintAdmin : ''}
            </p>
            <ul className="space-y-1.5">
                {members.map((m) => (
                    <li key={m.memberId} className="flex items-center gap-3 rounded-xl bg-pine/40 p-2">
                        <Avatar name={m.name} src={m.avatarUrl} />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                                {m.name}
                                {m.memberId === meId && <span className="ml-1 text-lime/50">{t.members.you}</span>}
                            </p>
                            <p className="text-xs text-lime/45">{m.signedIn ? t.members.member : t.members.guest}</p>
                        </div>
                        <RoleBadge role={m.role} />
                        {isAdmin && m.role !== 'admin' && (
                            <button
                                className="btn-secondary px-2.5 py-1.5 text-xs"
                                onClick={() => setRole(m.memberId, m.role === 'dj' ? 'listener' : 'dj')}>
                                {m.role === 'dj' ? t.members.removeDj : t.members.makeDj}
                            </button>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
