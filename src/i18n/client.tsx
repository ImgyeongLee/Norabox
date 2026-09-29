'use client';

import { createContext, useContext } from 'react';
import { DEFAULT_LOCALE, type Locale } from '@/i18n/config';
import { messagesFor, translateError } from '@/i18n/messages';

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

/** Set once in the root layout with the locale resolved on the server. */
export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
    return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

/** For Client Components: `const { t, tError, locale } = useI18n()`. */
export function useI18n() {
    const locale = useContext(LocaleContext);
    const t = messagesFor(locale);
    return { locale, t, tError: (code: string | null | undefined) => translateError(t, code) };
}
