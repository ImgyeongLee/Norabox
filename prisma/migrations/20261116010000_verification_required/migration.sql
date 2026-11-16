-- New sign-ups must confirm their email before logging in; older unconfirmed accounts are limited
-- to one playlist a day.
ALTER TABLE "User" ADD COLUMN "emailVerificationRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "lastPlaylistCreatedAt" TIMESTAMP(3);
