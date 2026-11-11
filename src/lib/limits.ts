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
