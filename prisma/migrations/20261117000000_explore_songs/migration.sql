-- Songs the site admin blurred or took out of Explore.
CREATE TABLE "ExploreSong" (
    "videoId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExploreSong_pkey" PRIMARY KEY ("videoId")
);

-- Like every other table: reachable only through the app (which owns the table), never Supabase's API.
ALTER TABLE "ExploreSong" ENABLE ROW LEVEL SECURITY;
