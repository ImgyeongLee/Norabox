'use client';

import { useEffect, useId, useState } from 'react';
import { useI18n } from '@/i18n/client';
import { scenarioKey } from '@/lib/validation';
import { LuCheck } from 'react-icons/lu';
import { Icon } from '@/components/icons';

type Suggestion = { id: string; name: string; writer: string | null; posts: number };

type Props = {
    scenario: string;
    writer: string;
    onScenario: (v: string) => void;
    onWriter: (v: string) => void;
    errors: { scenario?: string; writer?: string };
};

/**
 * Scenario title + writer inputs. While typing a title, scenarios that already
 * exist are listed under the input; picking one fills in both fields so the post
 * is grouped with others about the same scenario.
 */
export function ScenarioField({ scenario, writer, onScenario, onWriter, errors }: Props) {
    const listId = useId();
    const { t, tError } = useI18n();
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);

    useEffect(() => {
        const q = scenario.trim();
        if (!q) return;
        // Debounced; a response that arrives after the input changed again is ignored.
        // (Not aborted: an abort surfaces as an error in the Next.js dev overlay.)
        let stale = false;
        const t = setTimeout(async () => {
            try {
                const res = await fetch(`/api/scenarios?q=${encodeURIComponent(q)}`);
                if (!res.ok || stale) return;
                const data: { scenarios: Suggestion[] } = await res.json();
                if (stale) return;
                setSuggestions(data.scenarios);
                setActive(-1);
            } catch {
                // Offline: keep the previous suggestions.
            }
        }, 200);
        return () => {
            stale = true;
            clearTimeout(t);
        };
    }, [scenario]);

    const visible = open && scenario.trim() !== '' && suggestions.length > 0;
    const linked = suggestions.find(
        (s) => scenarioKey(s.name) === scenarioKey(scenario) && scenarioKey(s.writer ?? '') === scenarioKey(writer),
    );

    function pick(s: Suggestion) {
        onScenario(s.name);
        onWriter(s.writer ?? '');
        setOpen(false);
    }

    function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (!visible) return;
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const d = e.key === 'ArrowDown' ? 1 : -1;
            setActive((i) => (i + d + suggestions.length) % suggestions.length);
        } else if (e.key === 'Enter' && active >= 0) {
            e.preventDefault();
            pick(suggestions[active]);
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    }

    return (
        <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
            <div className="relative">
                <label htmlFor="scenario" className="label">
                    {t.scenario.label} <span className="font-normal text-lime/45">{t.common.optional}</span>
                </label>
                <input
                    id="scenario"
                    className="input"
                    value={scenario}
                    onChange={(e) => {
                        onScenario(e.target.value);
                        if (!e.target.value.trim()) setSuggestions([]);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setOpen(false)}
                    onKeyDown={onKeyDown}
                    maxLength={120}
                    placeholder={t.scenario.placeholder}
                    autoComplete="off"
                    role="combobox"
                    aria-expanded={visible}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    aria-activedescendant={visible && active >= 0 ? `${listId}-${active}` : undefined}
                    aria-invalid={!!errors.scenario}
                />
                {visible && (
                    <div className="card absolute inset-x-0 top-full z-20 mt-1 overflow-hidden bg-pine/95 shadow-2xl">
                        <p className="border-b border-leaf/30 px-3 py-2 text-xs text-lime/55">
                            {t.scenario.suggestionsHint}
                        </p>
                        <ul id={listId} role="listbox" className="max-h-64 overflow-y-auto py-1">
                            {suggestions.map((s, i) => (
                                <li
                                    key={s.id}
                                    id={`${listId}-${i}`}
                                    role="option"
                                    aria-selected={i === active}
                                    // mousedown, not click: fires before the input's blur closes the list.
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        pick(s);
                                    }}
                                    onMouseEnter={() => setActive(i)}
                                    className={`flex cursor-pointer items-baseline gap-2 px-3 py-2 text-sm ${
                                        i === active ? 'bg-fern' : ''
                                    }`}
                                >
                                    <span className="min-w-0 flex-1 truncate">
                                        <span className="font-medium">{s.name}</span>
                                        <span className="text-lime/55">
                                            {` · ${s.writer ?? t.scenario.writerUnknown}`}
                                        </span>
                                    </span>
                                    <span className="shrink-0 text-xs text-lime/45">
                                        {t.scenario.posts(s.posts)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {errors.scenario ? (
                    <p className="field-error">{tError(errors.scenario)}</p>
                ) : (
                    linked && <p className="mt-1.5 flex items-center gap-1 text-xs text-moss">
                            <Icon as={LuCheck} className="size-3.5" />
                            {t.scenario.linked}
                        </p>
                )}
            </div>
            <div>
                <label htmlFor="writer" className="label">
                    {t.scenario.writer} <span className="font-normal text-lime/45">{t.common.optional}</span>
                </label>
                <input
                    id="writer"
                    className="input"
                    value={writer}
                    onChange={(e) => onWriter(e.target.value)}
                    maxLength={80}
                    placeholder={t.scenario.writerPlaceholder}
                    autoComplete="off"
                    aria-invalid={!!errors.writer}
                />
                {errors.writer && <p className="field-error">{tError(errors.writer)}</p>}
            </div>
        </div>
    );
}
