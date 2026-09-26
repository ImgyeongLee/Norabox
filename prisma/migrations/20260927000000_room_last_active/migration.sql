-- AlterTable
ALTER TABLE "Room" ADD COLUMN "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "Room_lastActiveAt_idx" ON "Room"("lastActiveAt");
