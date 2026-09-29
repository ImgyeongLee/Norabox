import type { Locale } from "@/i18n/config";
import { en, type ErrorCode, type Messages } from "@/i18n/messages/en";
import { ko } from "@/i18n/messages/ko";

export type { ErrorCode, Messages };

export const messagesFor = (locale: Locale): Messages => (locale === "ko" ? ko : en);

/** Types a string as an error code, for server code that returns codes to the client. */
export const errorCode = (code: ErrorCode) => code;

/** Turns an error code from the API or realtime server into a message; unknown codes get a generic one. */
export function translateError(t: Messages, code: string | null | undefined): string {
  if (!code) return t.errors.generic;
  return (t.errors as Record<string, string>)[code] ?? t.errors.generic;
}
