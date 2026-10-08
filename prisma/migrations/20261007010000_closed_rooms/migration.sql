-- Rooms the admin closed to newcomers, and who may still get in.
ALTER TABLE "Room" ADD COLUMN "locked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Room" ADD COLUMN "allowedIdentities" TEXT[] DEFAULT ARRAY[]::TEXT[];
