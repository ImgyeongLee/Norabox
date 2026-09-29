-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_scenarioId_fkey";

-- AlterTable
ALTER TABLE "Post" ALTER COLUMN "scenarioId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
