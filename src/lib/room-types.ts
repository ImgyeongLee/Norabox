import type { Video } from "@/lib/validation";

// Types shared by the Socket.IO server and the room client.

export type Role = "admin" | "dj" | "listener";
export type LoopMode = "none" | "one" | "all";

export type PlaylistEntry = Video & {
  id: string;
  addedBy: string;
  /** Admin-only cue ("play when…"). Only included in the admin's copy of the room state. */
  memo?: string | null;
  /** Hidden by the admin as a surprise. Hidden songs are only in the admin's copy of the room state. */
  hidden?: boolean;
};

/**
 * Authoritative playback state. `position` is the track time (seconds) at
 * server time `updatedAt` (ms). While playing, the live position is
 * `position + (serverNow - updatedAt) / 1000`.
 */
export type Playback = {
  itemId: string | null;
  isPlaying: boolean;
  position: number;
  updatedAt: number;
  /** Increments on every change so clients can tell a restart from a no-op. */
  seq: number;
};

export type MemberView = {
  memberId: string;
  name: string;
  avatarUrl: string | null;
  role: Role;
  signedIn: boolean;
};

export type RoomSnapshot = {
  code: string;
  masterVolume: number;
  loopMode: LoopMode;
  /** Closed by the admin: nobody new can join. */
  locked: boolean;
  items: PlaylistEntry[];
  playback: Playback;
  members: MemberView[];
};

export type AckResult = { ok: true } | { ok: false; error: string };
export type Ack = (res: AckResult) => void;

export type JoinPayload = { code: string; clientId: string; name: string };
export type JoinResult =
  | { ok: true; memberId: string; snapshot: RoomSnapshot }
  | { ok: false; error: string };

export interface ClientToServerEvents {
  "room:join": (p: JoinPayload, ack: (r: JoinResult) => void) => void;
  "time:ping": (ack: (serverNow: number) => void) => void;
  "player:play": (ack?: Ack) => void;
  "player:pause": (ack?: Ack) => void;
  "player:seek": (p: { position: number }, ack?: Ack) => void;
  "player:select": (p: { itemId: string }, ack?: Ack) => void;
  "player:next": (ack?: Ack) => void;
  "player:prev": (ack?: Ack) => void;
  "player:ended": (p: { itemId: string }) => void;
  "player:duration": (p: { itemId: string; duration: number }) => void;
  "room:loop": (p: { mode: LoopMode }, ack?: Ack) => void;
  "room:masterVolume": (p: { volume: number }, ack?: Ack) => void;
  "playlist:add": (p: { video: Video }, ack?: Ack) => void;
  "playlist:addMany": (p: { videos: Video[] }, ack?: Ack) => void;
  "playlist:remove": (p: { itemId: string }, ack?: Ack) => void;
  "playlist:reorder": (p: { orderedIds: string[] }, ack?: Ack) => void;
  "playlist:memo": (p: { itemId: string; memo: string }, ack?: Ack) => void;
  "playlist:hide": (p: { itemId: string; hidden: boolean }, ack?: Ack) => void;
  /** Hides every song except the selected one, or shows them all. */
  "playlist:hideAll": (p: { hidden: boolean }, ack?: Ack) => void;
  "room:lock": (p: { locked: boolean }, ack?: Ack) => void;
  "member:setRole": (p: { memberId: string; role: "dj" | "listener" }, ack?: Ack) => void;
}

export interface ServerToClientEvents {
  "room:state": (s: RoomSnapshot) => void;
}

export const canControl = (role: Role | undefined) => role === "admin" || role === "dj";
