/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://hartzell.work/api',
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://hartzell.work/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
