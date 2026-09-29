import type { Video } from "@/lib/validation";

/** A forum post's playlist in the shape the room's Liked tab needs. */
export type ImportablePlaylist = {
  id: string;
  title: string;
  author: string;
  scenario: { name: string; writer: string | null } | null;
  tracks: Video[];
};
