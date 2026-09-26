import { SignJWT, jwtVerify } from "jose";

// Framework-agnostic token helpers, shared by route handlers and the Socket.IO
// server. The realtime server may live on another domain where the session
// cookie isn't sent, so the app hands out short-lived socket tokens instead.

export const SESSION_COOKIE = "norabox_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const SOCKET_TOKEN_MAX_AGE = 60 * 5; // 5 minutes; fetched fresh on every (re)connect

// Distinct audiences so a socket token can't be used as a session cookie.
const SESSION_AUD = "norabox:session";
const SOCKET_AUD = "norabox:socket";

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET must be set in production");
    }
    return new TextEncoder().encode("norabox-insecure-dev-secret");
  }
  return new TextEncoder().encode(secret);
}

function sign(userId: string, audience: string, maxAge: number) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(`${maxAge}s`)
    .sign(secretKey());
}

async function verify(token: unknown, audience: string) {
  if (typeof token !== "string" || !token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"], audience });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export const signSession = (userId: string) => sign(userId, SESSION_AUD, SESSION_MAX_AGE);
export const verifySession = (token: unknown) => verify(token, SESSION_AUD);
export const signSocketToken = (userId: string) => sign(userId, SOCKET_AUD, SOCKET_TOKEN_MAX_AGE);
export const verifySocketToken = (token: unknown) => verify(token, SOCKET_AUD);
