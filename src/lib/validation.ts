import { z } from "zod";

export const ROOM_CODE_RE = /^[A-Za-z0-9]+$/;

export const roomCodeSchema = z
  .string()
  .trim()
  .min(3, "Room name must be at least 3 characters")
  .max(32, "Room name must be at most 32 characters")
  .regex(ROOM_CODE_RE, "Use only letters and numbers — no spaces or special characters");

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(20, "Username must be at most 20 characters")
  .regex(/^[A-Za-z0-9_]+$/, "Username can contain letters, numbers and underscores");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long");

export const signupSchema = z
  .object({
    username: usernameSchema,
    email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
    password: passwordSchema,
    passwordConfirm: z.string(),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: "Passwords do not match",
    path: ["passwordConfirm"],
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "Enter your email"),
  password: z.string().min(1, "Enter your password"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: passwordSchema,
    newPasswordConfirm: z.string(),
  })
  .refine((d) => d.newPassword === d.newPasswordConfirm, {
    message: "Passwords do not match",
    path: ["newPasswordConfirm"],
  });

export const videoSchema = z.object({
  videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/, "Invalid YouTube video id"),
  title: z.string().trim().min(1).max(300),
  channel: z.string().trim().max(200),
  thumbnail: z.url().max(500),
  durationSec: z.number().int().positive().max(60 * 60 * 24).nullable(),
});

export type Video = z.infer<typeof videoSchema>;

export const postSchema = z.object({
  title: z.string().trim().min(1, "Give your post a title").max(120, "Title is too long"),
  description: z.string().trim().max(200, "Description is too long").optional().default(""),
  body: z.string().trim().max(5000, "Text is too long").optional().default(""),
  tracks: z.array(videoSchema).min(1, "Add at least one song").max(50, "A post can have up to 50 songs"),
});

/** First error message per field, for showing under form inputs. */
export function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    out[key] ??= issue.message;
  }
  return out;
}
