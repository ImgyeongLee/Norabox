// The site-wide announcement shown in a pop-up when someone visits.
// To post a new one: change `id` (so people who hid the old one see it), set
// `showUntil`, and update the `announcement` texts in src/i18n/messages.
// Set `announcement` to null to show nothing.

export type Announcement = {
  /** Unique per announcement; "don't show for 24 hours" is remembered per id. */
  id: string;
  /** Stops showing after this moment (ISO time with zone). */
  showUntil: string;
};

export const announcement: Announcement | null = {
  id: "db-move-2026-10-13",
  // End of the maintenance window: Oct 13, 4:00 AM Korea time.
  showUntil: "2026-10-13T04:00:00+09:00",
};
