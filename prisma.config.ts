import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations can use Neon's direct (unpooled) URL when provided.
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
