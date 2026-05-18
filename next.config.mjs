/** @type {import('next').NextConfig} */
const securityHeaders = [
  // No embedding from other origins — prevents clickjacking.
  { key: 'X-Frame-Options', value: 'DENY' },
  // Strict mime sniffing.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Disable old browser features we don't use that could leak data.
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  // Don't leak referrers to third-party origins.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
];

const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
