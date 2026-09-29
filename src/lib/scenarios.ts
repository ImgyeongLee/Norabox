import { prisma } from "@/lib/prisma";
import { scenarioKey } from "@/lib/validation";

/** Returns the scenario with this name + writer (case-insensitive), creating it if new. */
export async function findOrCreateScenario(name: string, writer: string) {
  const nameKey = scenarioKey(name);
  const writerKey = scenarioKey(writer);
  return prisma.scenario.upsert({
    where: { nameKey_writerKey: { nameKey, writerKey } },
    create: { name: name.trim().replace(/\s+/g, " "), writer: writer.trim() || null, nameKey, writerKey },
    update: {},
    select: { id: true },
  });
}

/** Removes scenarios no post refers to any more, so they stop appearing as suggestions. */
export async function deleteOrphanScenarios() {
  await prisma.scenario.deleteMany({ where: { posts: { none: {} } } });
}
