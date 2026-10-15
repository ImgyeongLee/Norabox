import { defineConfig } from 'vitest/config';

// Unit tests for server-side logic: no database, network or API keys needed.
export default defineConfig({
    // Resolve the "@/..." imports from tsconfig.json.
    resolve: { tsconfigPaths: true },
    test: {
        environment: 'node',
        include: ['tests/**/*.test.ts'],
        // Tests never read the developer's .env; they stub what they need.
        env: {
            YOUTUBE_API_KEY: '',
            DATABASE_URL: '',
            TURNSTILE_SECRET_KEY: '',
            UPSTASH_REDIS_REST_URL: '',
            UPSTASH_REDIS_REST_TOKEN: '',
            KV_REST_API_URL: '',
            KV_REST_API_TOKEN: '',
        },
    },
});
