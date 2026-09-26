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
import { GripIcon, TrashIcon } from '@/components/icons';
import { formatDuration } from '@/lib/format';

export type SortableTrack = {
    id: string;
    videoId: string;
    title: string;
    channel: string;
    thumbnail: string;
    durationSec: number | null;
    addedBy?: string;
};

type Props<T extends SortableTrack> = {
    items: T[];
    editable: boolean;
    currentId?: string | null;
    isPlaying?: boolean;
    onReorder: (orderedIds: string[]) => void;
    onRemove?: (id: string) => void;
    onSelect?: (id: string) => void;
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
    emptyText,
}: Props<T>) {
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
        return <p className="py-10 text-center text-sm text-lime/50">{emptyText ?? 'No songs yet.'}</p>;
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
}: {
    item: SortableTrack;
    index: number;
    editable: boolean;
    current: boolean;
    playing: boolean;
    onRemove?: (id: string) => void;
    onSelect?: (id: string) => void;
}) {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
        id: item.id,
        disabled: !editable,
    });

    return (
        <li
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            className={`group flex items-center gap-2 rounded-xl border p-2 transition ${
                current ? 'border-moss/70 bg-leaf/40' : 'border-transparent bg-pine/40 hover:bg-fern/50'
            } ${isDragging ? 'relative z-10 shadow-2xl ring-2 ring-moss' : ''}`}>
            {editable ? (
                <button
                    ref={setActivatorNodeRef}
                    {...attributes}
                    {...listeners}
                    className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-lime/40 hover:text-lime active:cursor-grabbing"
                    aria-label={`Reorder ${item.title}`}>
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
                aria-label={onSelect ? `Play ${item.title}` : undefined}>
                <span className="relative shrink-0">
                    <img src={item.thumbnail} alt="" className="aspect-video w-20 rounded-md object-cover" />
                    {playing && (
                        <span
                            className="absolute inset-0 flex items-end justify-center gap-0.5 rounded-md bg-pine/60 pb-1.5"
                            aria-label="Now playing">
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
            {editable && onRemove && (
                <button
                    type="button"
                    onClick={() => onRemove(item.id)}
                    className="icon-btn size-8 shrink-0 text-lime/40 hover:text-danger"
                    aria-label={`Remove ${item.title}`}>
                    <TrashIcon className="size-4" />
                </button>
            )}
        </li>
    );
}
