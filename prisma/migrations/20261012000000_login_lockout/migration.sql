-- Lock an account after too many wrong passwords in a row.
ALTER TABLE "User" ADD COLUMN "failedLogins" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lockedAt" TIMESTAMP(3);
