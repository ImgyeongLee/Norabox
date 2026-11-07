// How the forum, My playlists and Liked playlists show playlists: a grid of cards or a compact
// list. Remembered per browser in a cookie the pages read (ViewToggle sets it).

export const LIST_VIEW_COOKIE = "norabox_view";
export type ListView = "card" | "list";

export const listViewFrom = (cookie: string | undefined): ListView => (cookie === "list" ? "list" : "card");
