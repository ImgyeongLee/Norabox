'use client';

import { useRef, useState } from 'react';
import type { IconType } from 'react-icons';
import { LuBold, LuItalic, LuLink, LuList, LuListOrdered, LuQuote } from 'react-icons/lu';
import { Icon } from '@/components/icons';
import { Markdown } from '@/components/Markdown';
import { useI18n } from '@/i18n/client';

type Props = {
    id: string;
    value: string;
    onChange: (value: string) => void;
    maxLength: number;
    placeholder?: string;
    'aria-describedby'?: string;
};

type ToolId = 'bold' | 'italic' | 'link' | 'bullets' | 'numbers' | 'quote';

// Tooltips (and screen-reader labels) come from the dictionary (t.markdown.tools).
const TOOLS: { id: ToolId; icon: IconType }[] = [
    { id: 'bold', icon: LuBold },
    { id: 'italic', icon: LuItalic },
    { id: 'link', icon: LuLink },
    { id: 'bullets', icon: LuList },
    { id: 'numbers', icon: LuListOrdered },
    { id: 'quote', icon: LuQuote },
];

/** Markdown textarea with a formatting toolbar and a live preview tab. */
export function MarkdownEditor({ id, value, onChange, maxLength, placeholder, ...aria }: Props) {
    const { t } = useI18n();
    const tools = t.markdown.tools;
    const [tab, setTab] = useState<'write' | 'preview'>('write');
    const ref = useRef<HTMLTextAreaElement>(null);

    /** Replaces the selection and re-selects the inner text. */
    function replace(start: number, end: number, text: string, selStart: number, selEnd: number) {
        onChange(value.slice(0, start) + text + value.slice(end));
        requestAnimationFrame(() => {
            ref.current?.focus();
            ref.current?.setSelectionRange(selStart, selEnd);
        });
    }

    /** Wraps the selection, e.g. **bold**. */
    function wrap(before: string, after: string, fallback: string) {
        const ta = ref.current;
        if (!ta) return;
        const { selectionStart: s, selectionEnd: e } = ta;
        const inner = value.slice(s, e) || fallback;
        replace(s, e, before + inner + after, s + before.length, s + before.length + inner.length);
    }

    /** Prefixes every selected line, e.g. "- " for a list. */
    function prefixLines(prefix: (i: number) => string) {
        const ta = ref.current;
        if (!ta) return;
        const start = value.lastIndexOf('\n', ta.selectionStart - 1) + 1;
        const endIdx = value.indexOf('\n', ta.selectionEnd);
        const end = endIdx === -1 ? value.length : endIdx;
        const text = value
            .slice(start, end)
            .split('\n')
            .map((line, i) => prefix(i) + line)
            .join('\n');
        replace(start, end, text, start + text.length, start + text.length);
    }

    function apply(tool: ToolId) {
        if (tool === 'bold') wrap('**', '**', tools.bold.sample);
        else if (tool === 'italic') wrap('_', '_', tools.italic.sample);
        else if (tool === 'link') wrap('[', '](https://)', tools.link.sample);
        else if (tool === 'bullets') prefixLines(() => '- ');
        else if (tool === 'numbers') prefixLines((i) => `${i + 1}. `);
        else prefixLines(() => '> ');
    }

    function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (!(e.metaKey || e.ctrlKey)) return;
        const key = e.key.toLowerCase();
        if (key === 'b' || key === 'i') {
            e.preventDefault();
            apply(key === 'b' ? 'bold' : 'italic');
        }
    }

    return (
        <div className="overflow-hidden rounded-xl border border-leaf/60 bg-pine/70 focus-within:border-moss focus-within:ring-2 focus-within:ring-moss/40">
            <div className="flex flex-wrap items-center gap-1 border-b border-leaf/40 px-2 py-1.5">
                <div role="tablist" className="mr-1 flex rounded-lg bg-fern/50 p-0.5 text-xs font-semibold">
                    {(['write', 'preview'] as const).map((id) => (
                        <button
                            key={id}
                            type="button"
                            role="tab"
                            aria-selected={tab === id}
                            onClick={() => setTab(id)}
                            className={`rounded-md px-2.5 py-1 transition ${
                                tab === id ? 'bg-moss text-pine' : 'text-lime/70 hover:text-lime'
                            }`}
                        >
                            {t.markdown[id]}
                        </button>
                    ))}
                </div>
                {tab === 'write' &&
                    TOOLS.map((tool) => (
                        <button
                            key={tool.id}
                            type="button"
                            title={tools[tool.id].title}
                            aria-label={tools[tool.id].title}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => apply(tool.id)}
                            className="rounded-md p-1.5 text-lime/75 transition hover:bg-fern hover:text-lime"
                        >
                            <Icon as={tool.icon} className="size-4" />
                        </button>
                    ))}
                <span className="ml-auto text-[11px] text-lime/40">{t.markdown.supported}</span>
            </div>
            {tab === 'write' ? (
                <textarea
                    ref={ref}
                    id={id}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={onKeyDown}
                    maxLength={maxLength}
                    placeholder={placeholder}
                    className="block min-h-28 w-full resize-y bg-transparent px-3.5 py-2.5 text-sm text-lime outline-none placeholder:text-lime/35"
                    {...aria}
                />
            ) : (
                <div className="min-h-28 px-3.5 py-2.5 text-sm">
                    {value.trim() ? <Markdown>{value}</Markdown> : <p className="text-lime/40">{t.markdown.nothingToPreview}</p>}
                </div>
            )}
            <div className="border-t border-leaf/30 px-3.5 py-1 text-right font-mono text-[11px] text-lime/40">
                {value.length}/{maxLength}
            </div>
        </div>
    );
}
