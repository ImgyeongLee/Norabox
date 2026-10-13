export const LOCALES = ["en", "ko", "ja"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/** Readable by the browser, so the language switcher can set it without a round trip. */
export const LOCALE_COOKIE = "norabox_locale";

export const isLocale = (v: unknown): v is Locale => LOCALES.includes(v as Locale);

/** Cookie choice first; otherwise the browser's preferred language (Accept-Language). */
export function pickLocale(cookie: string | undefined, acceptLanguage: string | null | undefined): Locale {
  if (isLocale(cookie)) return cookie;
  const prefs = (acceptLanguage ?? "")
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().toLowerCase().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { lang: tag.split("-")[0], q: q ? Number(q.split("=")[1]) : 1 };
    })
    .filter((p) => p.lang && p.q > 0)
    .sort((a, b) => b.q - a.q);
  return prefs.map((p) => p.lang).find(isLocale) ?? DEFAULT_LOCALE;
}

const DATE_LOCALES: Record<Locale, string> = { en: "en-US", ko: "ko-KR", ja: "ja-JP" };
export const dateLocale = (locale: Locale) => DATE_LOCALES[locale];
