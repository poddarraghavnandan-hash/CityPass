/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@citypass/db', '@citypass/types', '@citypass/utils'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

module.exports = nextConfig;
