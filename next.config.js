const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable standalone output for Docker deployment
  output: 'standalone',
  // Security and performance
  poweredByHeader: false,
  // Disable compression if behind Cloudflare (let Cloudflare handle it)
  compress: process.env.PLATFORM_OPTIMIZATION !== 'cloudflare',
  compiler: {
    // Remove console logs in production for performance, except for important system logs
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn', 'log'], // We actually want to see [Migration] and [Server] logs
    } : false,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
    // Automatically optimize imports from these packages
    optimizePackageImports: ['lucide-react', 'xlsx', 'zod'],
    // Exclude packages from server-side bundling to avoid ESM/CJS conflicts
    serverComponentsExternalPackages: ['@exodus/bytes'],
  },
  env: {
    // Automatically enable Facebook login if credentials are provided
    // Can be manually overridden by setting NEXT_PUBLIC_FACEBOOK_ENABLED in .env
    NEXT_PUBLIC_FACEBOOK_ENABLED: process.env.NEXT_PUBLIC_FACEBOOK_ENABLED || (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET ? 'true' : 'false'),
  },
  images: {
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async headers() {
    // Build Content-Security-Policy directives
    // - unsafe-inline required for Next.js hydration scripts and Tailwind inline styles
    // - unsafe-eval required for Next.js dev mode source maps (omitted in production)
    const scriptSrcDirectives = [
      "'self'",
      "'unsafe-inline'",
      // Google OAuth, reCAPTCHA
      'https://accounts.google.com',
      'https://www.google.com',
      'https://www.gstatic.com',
      // Facebook OAuth
      'https://connect.facebook.net',
      // AMP runtime
      'https://cdn.ampproject.org',
      // Vercel Analytics / Speed Insights
      'https://va.vercel-scripts.com',
      'https://vitals.vercel-insights.com',
    ];
    if (process.env.NODE_ENV !== 'production') {
      scriptSrcDirectives.push("'unsafe-eval'");
    }

    const cspDirectives = [
      "default-src 'self'",
      `script-src ${scriptSrcDirectives.join(' ')}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https:",
      "frame-src 'self' https://accounts.google.com https://www.facebook.com https://www.google.com",
      "frame-ancestors 'self'",
      "form-action 'self' https://accounts.google.com https://www.facebook.com",
      "base-uri 'self'",
      "object-src 'none'",
      "worker-src 'self' blob:",
    ].join('; ');

    const headers = [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspDirectives,
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];

    // Add HSTS and other production headers
    if (process.env.NODE_ENV === 'production') {
      headers[0].headers.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains; preload',
      });
    }

    // Platform-specific headers
    if (process.env.PLATFORM_OPTIMIZATION === 'cloudflare') {
      // Optimizations for Cloudflare Zero Trust
      headers[0].headers.push({
        key: 'Cache-Control',
        value: 'public, s-maxage=31536000, stale-while-revalidate=59',
      });
    }

    if (process.env.PLATFORM_OPTIMIZATION === 'vercel') {
      // Vercel CDN caching for the two guest-facing hot paths.
      //
      // /inv/  – short URL resolver.  Codes are permanent so we cache for the
      //          full SHORT_URL_CACHE_TTL_HOURS window (default 24 h).
      //          stale-while-revalidate lets Vercel serve the cached page
      //          while silently regenerating it in the background, so guests
      //          never wait for a cold render after the TTL expires.
      const shortUrlTtlSeconds = (Number(process.env.SHORT_URL_CACHE_TTL_HOURS) || 24) * 3600;
      headers.push({
        source: '/inv/:initials/:shortCode',
        headers: [
          {
            key: 'Cache-Control',
            value: `public, s-maxage=${shortUrlTtlSeconds}, stale-while-revalidate=${shortUrlTtlSeconds}`,
          },
        ],
      });

      // /rsvp/ – RSVP page.  Cached for RSVP_CACHE_TTL_HOURS (default 1 h).
      //          On-demand revalidation via revalidatePath() keeps the cache
      //          fresh whenever an admin updates the template or wedding data.
      const rsvpTtlSeconds = (Number(process.env.RSVP_CACHE_TTL_HOURS) || 1) * 3600;
      headers.push({
        source: '/rsvp/:token',
        headers: [
          {
            key: 'Cache-Control',
            value: `public, s-maxage=${rsvpTtlSeconds}, stale-while-revalidate=${rsvpTtlSeconds}`,
          },
        ],
      });
    }

    return headers;
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/uploads/:path*',
          destination: '/api/uploads/:path*',
        },
      ],
    };
  },
}

module.exports = withNextIntl(nextConfig);
