import { cookies, headers } from "next/headers";
import { cache } from "react";
import { LOCALE_COOKIE, pickLocale } from "@/i18n/config";
import { messagesFor } from "@/i18n/messages";

/** The visitor's language for this request: their saved choice, else their browser's. */
export const getLocale = cache(async () => {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  return pickLocale(cookieStore.get(LOCALE_COOKIE)?.value, headerStore.get("accept-language"));
});

/** For Server Components: `const { t, locale } = await getI18n()`. */
export const getI18n = cache(async () => {
  const locale = await getLocale();
  return { locale, t: messagesFor(locale) };
});
