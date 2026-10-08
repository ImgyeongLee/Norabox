-- Songs the room admin hides from everyone else until playing them.
ALTER TABLE "PlaylistItem" ADD COLUMN "hidden" BOOLEAN NOT NULL DEFAULT false;
