import { z } from "zod";
import type { ErrorCode } from "@/i18n/messages/en";
import { MAX_ANNOUNCEMENT_BODY, MAX_MEMO, MAX_POST_TRACKS } from "@/lib/limits";

export { MAX_POST_TRACKS };

// Validation messages are error codes (see src/i18n/messages); the UI translates them.
const e = (code: ErrorCode) => code;

export const ROOM_CODE_RE = /^[A-Za-z0-9]+$/;

export const roomCodeSchema = z
  .string()
  .trim()
  .min(3, e("roomNameShort"))
  .max(32, e("roomNameLong"))
  .regex(ROOM_CODE_RE, e("roomNameChars"));

export const usernameSchema = z
  .string()
  .trim()
  .min(3, e("usernameShort"))
  .max(20, e("usernameLong"))
  .regex(/^[A-Za-z0-9_]+$/, e("usernameChars"));

export const passwordSchema = z
  .string()
  .min(8, e("passwordShort"))
  .max(128, e("passwordLong"));

export const signupSchema = z
  .object({
    username: usernameSchema,
    email: z.string().trim().toLowerCase().pipe(z.email(e("emailInvalid"))),
    password: passwordSchema,
    passwordConfirm: z.string(),
    // The "I am 14 or older" checkbox (a checked box is sent as "on"); under-14s can't sign up.
    ageConfirmed: z.literal("on", e("ageRequired")),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: e("passwordsMismatch"),
    path: ["passwordConfirm"],
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, e("emailRequired")),
  password: z.string().min(1, e("passwordRequired")),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, e("currentPasswordRequired")),
    newPassword: passwordSchema,
    newPasswordConfirm: z.string(),
  })
  .refine((d) => d.newPassword === d.newPasswordConfirm, {
    message: e("passwordsMismatch"),
    path: ["newPasswordConfirm"],
  });

export const videoSchema = z.object({
  videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/, e("invalidVideo")),
  title: z.string().trim().min(1, e("invalidVideo")).max(300, e("invalidVideo")),
  channel: z.string().trim().max(200, e("invalidVideo")),
  thumbnail: z.url(e("invalidVideo")).max(500, e("invalidVideo")),
  durationSec: z.number(e("invalidVideo")).int().positive().max(60 * 60 * 24).nullable(),
});

export type Video = z.infer<typeof videoSchema>;

/** A song being added to a room, with the memo it had in the playlist it came from (if any). */
export const roomSongSchema = videoSchema.extend({
  // Older playlist memos can be longer than a room memo; cut them rather than refusing the song.
  memo: z
    .string()
    .nullish()
    .transform((m) => m?.trim().slice(0, MAX_MEMO) || null),
});

export type RoomSong = z.input<typeof roomSongSchema>;

/** A playlist memo as typed by its author (empty clears it). */
export const memoSchema = z.string().trim().max(MAX_MEMO, e("memoLong"));

export const postSchema = z
  .object({
    title: z.string().trim().min(1, e("titleRequired")).max(120, e("titleLong")),
    scenario: z.string().trim().max(120, e("scenarioLong")).optional().default(""),
    visibility: z.enum(["private", "unlisted", "public"], e("invalidInput")).optional().default("private"),
    writer: z.string().trim().max(80, e("writerLong")).optional().default(""),
    tracks: z
      .array(
        videoSchema.extend({
          memo: memoSchema.optional().default(""),
        }),
      )
      .min(1, e("songsRequired"))
      .max(MAX_POST_TRACKS, e("songsMax")),
  })
  .refine((d) => d.scenario || !d.writer, {
    message: e("writerNeedsScenario"),
    path: ["writer"],
  });

export type PostInput = z.infer<typeof postSchema>;

export const announcementSchema = z.object({
  title: z.string().trim().min(1, e("titleRequired")).max(120, e("titleLong")),
  body: z.string().trim().min(1, e("bodyRequired")).max(MAX_ANNOUNCEMENT_BODY, e("bodyLong")),
});

/** Normalises a scenario name or writer for matching ("  The Lost Mine " → "the lost mine"). */
export const scenarioKey = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

/** First error code per field, for showing under form inputs. Unknown (zod default) messages become "invalidInput". */
export function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    out[key] ??= /^[a-zA-Z]+$/.test(issue.message) ? issue.message : e("invalidInput");
  }
  return out;
}
