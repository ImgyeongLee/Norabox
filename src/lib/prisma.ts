import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

// One client per process (or per warm serverless instance), cached on globalThis
// so dev hot-reloads and the custom Socket.IO server share it with route handlers.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const isNeon = (url: string) => {
    try {
        return new URL(url).hostname.endsWith('.neon.tech');
    } catch {
        return false;
    }
};

/**
 * Standard Postgres (e.g. Supabase) through node-postgres. Supabase signs its
 * certificates with its own CA: put that CA (PEM text, from Supabase → Database →
 * SSL configuration) in DATABASE_CA_CERT to verify the server. Without it the
 * connection is still encrypted, but the server's identity isn't checked.
 */
function postgresAdapter(url: string) {
    const u = new URL(url);
    // Prisma-specific / libpq-style flags that node-postgres doesn't understand.
    u.searchParams.delete('pgbouncer');
    u.searchParams.delete('sslmode');
    const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, '\n').trim();
    if (!ca) {
        console.warn("[db] DATABASE_CA_CERT is not set: TLS is on, but the database certificate isn't verified.");
    }
    return new PrismaPg({
        connectionString: u.toString(),
        ssl: ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false },
        // Keep it small: serverless functions each get their own pool, and poolers limit clients.
        max: 5,
        idleTimeoutMillis: 10_000,
    });
}

function createClient() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL is not set');
    // Neon's serverless driver talks to Postgres over WebSockets (Neon only);
    // anything else (Supabase, plain Postgres) uses node-postgres.
    const adapter = isNeon(connectionString) ? new PrismaNeon({ connectionString }) : postgresAdapter(connectionString);
    return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();
globalForPrisma.prisma = prisma;
