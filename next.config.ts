import type { NextConfig } from 'next';
const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  logging: { incomingRequests: { ignore: [/\/api\/auth\/callback\//] } },
  serverExternalPackages: ['@electric-sql/pglite', 'pg'],
  async headers() {
    const dev = process.env.NODE_ENV !== 'production';
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: `default-src 'self'; script-src 'self' 'unsafe-inline' ${dev ? "'unsafe-eval'" : ''} https://player.twitch.tv; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://static-cdn.jtvnw.net; font-src 'self'; connect-src 'self' ${dev ? 'ws://localhost:* ws://127.0.0.1:*' : ''}; frame-src 'self' https://player.twitch.tv https://www.twitch.tv; frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self'`,
          },
        ],
      },
    ];
  },
};
export default config;
