import { dateLocale, type Locale } from "@/i18n/config";

export function formatDuration(sec: number | null | undefined) {
  if (sec == null || !Number.isFinite(sec)) return "--:--";
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** A moment shown in Korea time, e.g. "11월 17일 오전 9:00 (KST)" — used for "try again from …". */
export function formatKst(d: Date, locale: Locale) {
  const time = d.toLocaleString(dateLocale(locale), {
    timeZone: "Asia/Seoul",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return `${time} (KST)`;
}

export function formatDate(d: Date, locale: Locale) {
  return d.toLocaleDateString(dateLocale(locale), { month: "short", day: "numeric", year: "numeric" });
}
