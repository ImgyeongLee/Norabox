import type { MetadataRoute } from 'next';

/**
 * Every Norabox page is rendered on demand, so each page a crawler opens runs a serverless function
 * and queries the database. Search engines may index the public pages; rooms, share links, the API
 * and account pages have nothing to index. Crawlers that only collect AI training data are turned
 * away entirely. (Crawlers that ignore robots.txt aren't stopped by this.)
 */
const AI_TRAINING_BOTS = [
    'GPTBot',
    'CCBot',
    'ClaudeBot',
    'anthropic-ai',
    'Google-Extended',
    'Applebot-Extended',
    'Bytespider',
    'meta-externalagent',
    'Amazonbot',
    'PerplexityBot',
    'cohere-ai',
    'Diffbot',
    'omgili',
    'ImagesiftBot',
];

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/api/',
                    '/room/',
                    '/s/',
                    '/login',
                    '/signup',
                    '/forgot-password',
                    '/reset-password',
                    '/verify-email',
                    '/profile',
                    '/playlists',
                    '/liked',
                    '/forum/new',
                    '/announcements/new',
                    '/*/edit',
                ],
            },
            { userAgent: AI_TRAINING_BOTS, disallow: '/' },
        ],
    };
}
