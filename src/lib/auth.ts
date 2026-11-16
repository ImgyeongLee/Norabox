import { cookies } from "next/headers";
import { cache } from "react";
import { avatarUrlFor } from "@/lib/avatar";
import { prisma } from "@/lib/prisma";
import { USER_ACTIVE } from "@/lib/users";
import {
  PENDING_COOKIE,
  PENDING_MAX_AGE,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  signPending,
  signSession,
  verifyPending,
  verifySession,
} from "@/lib/session";

export type CurrentUser = {
  id: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  /** Whether they confirmed their email address through the link we emailed them. */
  emailVerified: boolean;
  /** When the last verification email was sent (null: none yet, or it couldn't be sent). */
  verifyEmailSentAt: Date | null;
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const store = await cookies();
  const userId = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!userId) return null;
  // Sessions of deleted accounts stop working immediately.
  const user = await prisma.user.findUnique({
    where: { id: userId, status: USER_ACTIVE },
    select: {
      id: true,
      username: true,
      email: true,
      avatarMime: true,
      updatedAt: true,
      emailVerifiedAt: true,
      verifyEmailSentAt: true,
      emailVerificationRequired: true,
    },
  });
  if (!user) return null;
  // New members aren't logged in until they confirm their email (they never get a session before
  // that; this is a second line of defence).
  if (mustVerifyFirst(user)) return null;
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    avatarUrl: avatarUrlFor(user),
    emailVerified: user.emailVerifiedAt !== null,
    verifyEmailSentAt: user.verifyEmailSentAt,
  };
});

const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge,
});

export async function startSession(userId: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, await signSession(userId), cookieOptions(SESSION_MAX_AGE));
}

/** Whether this account still has to confirm its email before it may log in. */
export const mustVerifyFirst = (u: { emailVerificationRequired: boolean; emailVerifiedAt: Date | null }) =>
  u.emailVerificationRequired && !u.emailVerifiedAt;

/** Remembers which new member is waiting to confirm their email (see PENDING_COOKIE). */
export async function startPending(userId: string) {
  const store = await cookies();
  store.set(PENDING_COOKIE, await signPending(userId), cookieOptions(PENDING_MAX_AGE));
}

/** The new member waiting to confirm their email in this browser, if any. */
export async function getPendingUser() {
  const store = await cookies();
  const userId = await verifyPending(store.get(PENDING_COOKIE)?.value);
  if (!userId) return null;
  return prisma.user.findUnique({
    where: { id: userId, status: USER_ACTIVE },
    select: { id: true, username: true, email: true, emailVerifiedAt: true, verifyEmailSentAt: true },
  });
}

export async function endPending() {
  const store = await cookies();
  store.delete(PENDING_COOKIE);
}

export async function endSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
