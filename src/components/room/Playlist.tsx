'use client';

/* eslint-disable @next/next/no-img-element -- YouTube thumbnails */
import {
    closestCenter,
    DndContext,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import { LuEllipsis, LuEye, LuEyeOff, LuStickyNote } from 'react-icons/lu';
import { GripIcon, Icon, TrashIcon } from '@/components/icons';
import { useI18n } from '@/i18n/client';
import { formatDuration } from '@/lib/format';
import { MAX_MEMO } from '@/lib/limits';

export type SortableTrack = {
    id: string;
    videoId: string;
    title: string;
    channel: string;
    thumbnail: string;
    durationSec: number | null;
    addedBy?: string;
    memo?: string | null;
    hidden?: boolean;
};

type Props<T extends SortableTrack> = {
    items: T[];
    editable: boolean;
    currentId?: string | null;
    isPlaying?: boolean;
    onReorder: (orderedIds: string[]) => void;
    onRemove?: (id: string) => void;
    onSelect?: (id: string) => void;
    /** Set for the room admin: shows and edits per-song memos. Resolves true when saved. */
    onMemo?: (id: string, memo: string) => Promise<boolean>;
    /** Set for the room admin: hides a song from everyone else, or shows it again. */
    onToggleHidden?: (id: string, hidden: boolean) => void;
    /** Extra controls for a row, shown in its "⋯" menu. */
    actions?: (item: T) => React.ReactNode;
    emptyText?: string;
};

/** Drag-and-drop sortable track list, shared by rooms and the post editor. */
export function Playlist<T extends SortableTrack>({
    items,
    editable,
    currentId,
    isPlaying,
    onReorder,
    onRemove,
    onSelect,
    onMemo,
    onToggleHidden,
    actions,
    emptyText,
}: Props<T>) {
    const { t } = useI18n();
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    // Optimistic order while the server confirms a drag. Reset whenever new items arrive.
    const [optimistic, setOptimistic] = useState<{ source: T[]; ids: string[] } | null>(null);
    const ordered =
        optimistic && optimistic.source === items
            ? optimistic.ids.map((id) => items.find((i) => i.id === id)).filter((i): i is T => !!i)
            : items;

    function onDragEnd(e: DragEndEvent) {
        const { active, over } = e;
        if (!over || active.id === over.id) return;
        const ids = ordered.map((i) => i.id);
        const next = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
        setOptimistic({ source: items, ids: next });
        onReorder(next);
    }

    if (items.length === 0) {
        return <p className="py-10 text-center text-sm text-lime/50">{emptyText ?? t.playlist.empty}</p>;
    }

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={ordered.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                <ol className="space-y-1.5">
                    {ordered.map((item, idx) => (
                        <Row
                            key={item.id}
                            item={item}
                            index={idx}
                            editable={editable}
                            current={item.id === currentId}
                            playing={item.id === currentId && !!isPlaying}
                            onRemove={onRemove}
                            onSelect={onSelect}
                            onMemo={onMemo}
                            onToggleHidden={onToggleHidden}
                            actions={actions?.(item)}
                        />
                    ))}
                </ol>
            </SortableContext>
        </DndContext>
    );
}

function Row({
    item,
    index,
    editable,
    current,
    playing,
    onRemove,
    onSelect,
    onMemo,
    onToggleHidden,
    actions,
}: {
    item: SortableTrack;
    index: number;
    editable: boolean;
    current: boolean;
    playing: boolean;
    onRemove?: (id: string) => void;
    onSelect?: (id: string) => void;
    onMemo?: (id: string, memo: string) => Promise<boolean>;
    onToggleHidden?: (id: string, hidden: boolean) => void;
    actions?: React.ReactNode;
}) {
    const { t } = useI18n();
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
        id: item.id,
        disabled: !editable,
    });
    const [menuOpen, setMenuOpen] = useState(false);
    const [memoDraft, setMemoDraft] = useState<string | null>(null); // null = not editing the memo
    const canRemove = editable && !!onRemove;
    // A lone remove button fits next to the title; more than that goes into a "⋯" menu so the title stays readable.
    const useMenu = !!actions || !!onToggleHidden || !!onMemo;

    return (
        <li
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            className={`group flex flex-wrap items-center gap-2 rounded-xl border p-2 transition ${
                current
                    ? 'border-moss/70 bg-leaf/40'
                    : item.hidden
                      ? 'border-dashed border-lime/25 bg-pine/20 hover:bg-fern/30'
                      : 'border-transparent bg-pine/40 hover:bg-fern/50'
            } ${isDragging ? 'relative z-10 shadow-2xl ring-2 ring-moss' : ''}`}>
            {editable ? (
                <button
                    ref={setActivatorNodeRef}
                    {...attributes}
                    {...listeners}
                    className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-lime/40 hover:text-lime active:cursor-grabbing"
                    aria-label={t.playlist.reorder(item.title)}>
                    <GripIcon className="size-4" />
                </button>
            ) : (
                <span className="w-6 shrink-0 text-center font-mono text-xs text-lime/40">{index + 1}</span>
            )}
            <button
                type="button"
                onClick={() => onSelect?.(item.id)}
                disabled={!onSelect}
                className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default"
                aria-label={onSelect ? t.playlist.play(item.title) : undefined}>
                <span className="relative shrink-0">
                    <img
                        src={item.thumbnail}
                        alt=""
                        className={`aspect-video w-20 rounded-md object-cover ${item.hidden ? 'opacity-50' : ''}`}
                    />
                    {playing && (
                        <span
                            className="absolute inset-0 flex items-end justify-center gap-0.5 rounded-md bg-pine/60 pb-1.5"
                            aria-label={t.playlist.nowPlaying}>
                            {[0, 1, 2].map((i) => (
                                <span
                                    key={i}
                                    className="w-1 animate-pulse rounded-sm bg-lime"
                                    style={{ height: `${8 + i * 4}px`, animationDelay: `${i * 150}ms` }}
                                />
                            ))}
                        </span>
                    )}
                </span>
                <span className="min-w-0 flex-1">
                    <span
                        className={`line-clamp-2 text-sm font-medium leading-snug ${current ? 'text-lime' : 'text-lime/90'}`}>
                        {item.title}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-lime/50">
                        {item.channel}
                        {item.addedBy ? ` · ${item.addedBy}` : ''}
                    </span>
                </span>
            </button>
            <span className="hidden shrink-0 font-mono text-xs text-lime/50 sm:block">
                {formatDuration(item.durationSec)}
            </span>
            {item.hidden && (
                <span title={t.playlist.hidden} className="flex shrink-0 items-center text-moss">
                    <Icon as={LuEyeOff} className="size-4" />
                    <span className="sr-only">{t.playlist.hidden}</span>
                </span>
            )}
            {useMenu ? (
                <button
                    type="button"
                    onClick={() => setMenuOpen((o) => !o)}
                    aria-expanded={menuOpen}
                    aria-label={t.playlist.more(item.title)}
                    title={t.playlist.more(item.title)}
                    className={`icon-btn size-8 shrink-0 ${menuOpen ? 'text-lime' : 'text-lime/40 hover:text-lime'}`}>
                    <Icon as={LuEllipsis} className="size-4" />
                </button>
            ) : (
                canRemove && (
                    <button
                        type="button"
                        onClick={() => onRemove!(item.id)}
                        className="icon-btn size-8 shrink-0 text-lime/40 hover:text-danger"
                        aria-label={t.playlist.remove(item.title)}>
                        <TrashIcon className="size-4" />
                    </button>
                )
            )}
            {useMenu && menuOpen && (
                <div className="ml-10 flex basis-full flex-wrap gap-1.5">
                    {actions}
                    {onMemo && (
                        <button
                            type="button"
                            onClick={() => {
                                setMemoDraft(item.memo ?? '');
                                setMenuOpen(false);
                            }}
                            className="btn-ghost gap-1 px-2 py-1 text-xs">
                            <Icon as={LuStickyNote} className="size-3.5" />
                            {item.memo ? t.memo.edit : t.memo.add}
                        </button>
                    )}
                    {onToggleHidden && (
                        <button
                            type="button"
                            onClick={() => {
                                onToggleHidden(item.id, !item.hidden);
                                setMenuOpen(false);
                            }}
                            // The selected song is already in front of everyone; it can't become a surprise.
                            disabled={current && !item.hidden}
                            title={item.hidden ? t.playlist.unhide(item.title) : t.playlist.hide(item.title)}
                            className="btn-ghost gap-1 px-2 py-1 text-xs disabled:opacity-40">
                            <Icon as={item.hidden ? LuEye : LuEyeOff} className="size-3.5" />
                            {item.hidden ? t.playlist.showLabel : t.playlist.hideLabel}
                        </button>
                    )}
                    {canRemove && (
                        <button
                            type="button"
                            onClick={() => onRemove!(item.id)}
                            aria-label={t.playlist.remove(item.title)}
                            className="btn-ghost gap-1 px-2 py-1 text-xs hover:text-danger">
                            <TrashIcon className="size-3.5" />
                            {t.playlist.removeLabel}
                        </button>
                    )}
                </div>
            )}
            {onMemo && (
                <MemoLine
                    memo={item.memo ?? null}
                    draft={memoDraft}
                    setDraft={setMemoDraft}
                    onSave={(memo) => onMemo(item.id, memo)}
                />
            )}
        </li>
    );
}

/**
 * Admin-only cue under a song: shows the memo (click to edit inline), or the editor once
 * "Add memo" is picked from the song's "⋯" menu.
 */
function MemoLine({
    memo,
    draft,
    setDraft,
    onSave,
}: {
    memo: string | null;
    /** null when not editing. */
    draft: string | null;
    setDraft: (draft: string | null) => void;
    onSave: (memo: string) => Promise<boolean>;
}) {
    const { t } = useI18n();
    const [saving, setSaving] = useState(false);

    async function save() {
        if (draft === null) return;
        setSaving(true);
        const ok = await onSave(draft);
        setSaving(false);
        if (ok) setDraft(null);
    }

    if (draft === null) {
        return memo ? (
            <button
                type="button"
                onClick={() => setDraft(memo)}
                title={t.memo.edit}
                className="ml-10 flex w-full min-w-0 items-start gap-1.5 rounded-lg bg-moss/15 px-2 py-1 text-left text-xs text-lime/85 hover:bg-moss/25"
            >
                <Icon as={LuStickyNote} className="mt-px size-3.5 shrink-0 text-moss" />
                <span className="whitespace-pre-wrap wrap-break-word">{memo}</span>
            </button>
        ) : null;
    }

    return (
        <div className="ml-10 w-full min-w-0 space-y-1">
            <div className="flex gap-1.5">
                <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            save();
                        } else if (e.key === 'Escape') {
                            setDraft(null);
                        }
                    }}
                    maxLength={MAX_MEMO}
                    placeholder={t.memo.placeholder}
                    aria-label={t.memo.label}
                    className="input py-1.5 text-xs"
                />
                <button type="button" onClick={save} disabled={saving} className="btn-primary shrink-0 px-2.5 py-1 text-xs">
                    {saving ? '…' : t.memo.save}
                </button>
            </div>
            <p className="text-[10px] text-lime/40">{t.memo.hint}</p>
        </div>
    );
}
