// Limits shared by validation, the realtime server and the UI's messages.
export const MAX_POST_TRACKS = 100;
export const MAX_ROOM_ITEMS = 500;
/** People in one room at once (every change is sent to each of them). */
export const MAX_ROOM_MEMBERS = 30;
/** Songs a room takes from one YouTube playlist: as many as YouTube's embedded player holds. */
export const MAX_PLAYLIST_IMPORT = 200;
export const MAX_MEMO = 300;
export const MAX_ANNOUNCEMENT_BODY = 20000;
/** Wrong passwords in a row before an account is locked. */
export const MAX_LOGIN_ATTEMPTS = 5;
/** Emails Brevo's free plan sends per day. Norabox counts its own sends so it can stop at the limit. */
export const EMAIL_DAILY_LIMIT = 300;
/**
 * Hour (UTC) when the daily email count starts over. Brevo doesn't document when its free quota
 * resets; 0 (midnight UTC = 09:00 KST) is what it's reported to use. Change it if Brevo's differs.
 */
export const EMAIL_QUOTA_RESET_UTC_HOUR = 0;
/** Seconds one account must wait between two verification (or two reset) emails. */
export const EMAIL_RESEND_COOLDOWN_SEC = 60;
/** How long the link in a verification / password-reset email works. */
export const VERIFY_LINK_TTL_SEC = 60 * 60 * 24;
export const RESET_LINK_TTL_SEC = 60 * 60;
/** Rooms a guest (per IP address) or a member who hasn't confirmed their email can make a day (KST). */
export const UNVERIFIED_DAILY_ROOMS = 10;
