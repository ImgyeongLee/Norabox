import type { Video } from "@/lib/validation";

/** A playlist (forum post) in the shape the room's Library tab needs. */
export type ImportablePlaylist = {
  id: string;
  title: string;
  /** null when the author deleted their account. */
  author: string | null;
  scenario: { name: string; writer: string | null } | null;
  tracks: Video[];
};
