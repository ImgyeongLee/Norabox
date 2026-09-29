'use client';

import { useState } from 'react';
import { useI18n } from '@/i18n/client';

export function CopyButton({
    text,
    label,
    className = 'btn-secondary',
}: {
    text: string | (() => string);
    label: string;
    className?: string;
}) {
    const { t } = useI18n();
    const [copied, setCopied] = useState(false);
    async function copy() {
        const value = typeof text === 'function' ? text() : text;
        try {
            await navigator.clipboard.writeText(value);
        } catch {
            // Clipboard API can be unavailable on insecure origins (e.g. LAN IP in dev).
            const ta = document.createElement('textarea');
            ta.value = value;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }
    return (
        <button type="button" onClick={copy} className={className}>
            {copied ? t.common.copied : label}
        </button>
    );
}
