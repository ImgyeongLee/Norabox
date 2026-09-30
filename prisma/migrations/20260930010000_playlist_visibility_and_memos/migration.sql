-- Playlist visibility. Posts that already exist were published on the forum, so they stay public;
-- new posts default to private.
ALTER TABLE "Post" ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'private';
UPDATE "Post" SET "visibility" = 'public';

-- Secret token for share links (/s/<token>); random for existing posts.
ALTER TABLE "Post" ADD COLUMN "shareToken" TEXT;
UPDATE "Post" SET "shareToken" = replace(gen_random_uuid()::text, '-', '');
ALTER TABLE "Post" ALTER COLUMN "shareToken" SET NOT NULL;
CREATE UNIQUE INDEX "Post_shareToken_key" ON "Post"("shareToken");

CREATE INDEX "Post_visibility_createdAt_idx" ON "Post"("visibility", "createdAt");
CREATE INDEX "Post_authorId_updatedAt_idx" ON "Post"("authorId", "updatedAt");

-- Admin-only memos on room songs.
ALTER TABLE "PlaylistItem" ADD COLUMN "memo" TEXT;
