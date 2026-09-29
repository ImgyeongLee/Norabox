-- AlterTable
ALTER TABLE "Post" DROP COLUMN "body",
DROP COLUMN "description",
ADD COLUMN     "scenarioId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PostTrack" ADD COLUMN     "description" TEXT;

-- CreateTable
CREATE TABLE "Scenario" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "writer" TEXT,
    "nameKey" TEXT NOT NULL,
    "writerKey" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Scenario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Scenario_nameKey_writerKey_key" ON "Scenario"("nameKey", "writerKey");

-- CreateIndex
CREATE INDEX "Post_scenarioId_idx" ON "Post"("scenarioId");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
