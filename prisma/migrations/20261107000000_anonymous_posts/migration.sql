-- Playlists posted without the author's name.
ALTER TABLE "Post" ADD COLUMN "anonymous" BOOLEAN NOT NULL DEFAULT false;
