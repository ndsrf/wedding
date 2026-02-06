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
    // Remove console logs in production for performance
    removeConsole: process.env.NODE_ENV === 'production',
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
    // Automatically optimize imports from these packages
    optimizePackageImports: ['lucide-react', 'xlsx', 'zod'],
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
    const headers = [
      {
        source: '/:path*',
        headers: [
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
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
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
