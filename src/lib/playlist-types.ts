import type { Video } from "@/lib/validation";

/** A playlist (forum post) in the shape the room's Library tab needs. */
export type ImportablePlaylist = {
  id: string;
  title: string;
  /** null when the playlist is anonymous or the author deleted their account. */
  author: string | null;
  scenario: { name: string; writer: string | null } | null;
  /**
   * `id` is the song's id within this playlist (used to reorder your own playlists).
   * `memo` (anyone who can see the playlist can read it) comes along when its songs are added to a room.
   */
  tracks: (Video & { id: string; memo?: string | null })[];
};
