/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@citypass/agent',
    '@citypass/analytics',
    '@citypass/cag',
    '@citypass/db',
    '@citypass/llm',
    '@citypass/rag',
    '@citypass/ranker',
    '@citypass/search',
    '@citypass/slate',
    '@citypass/social',
    '@citypass/taste',
    '@citypass/types',
    '@citypass/utils',
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },
  // Enable compression
  compress: true,
  // Production source maps for better debugging
  productionBrowserSourceMaps: false,
  // Strict mode for better development experience
  reactStrictMode: true,
  // Remove powered-by header
  poweredByHeader: false,
  // Externalize Anthropic SDK and OpenAI SDK to avoid bundling issues
  serverExternalPackages: ['@anthropic-ai/sdk', 'openai', '@mapbox/mapbox-sdk', 'keyv', 'got', 'cacheable-request'],
  env: {
    CITYLENS_ENABLED: process.env.CITYLENS_ENABLED,
  },

  // Turbopack configuration (Next.js 16+)
  turbopack: {},

  webpack: (config, { isServer }) => {
    // Find and modify the rule that handles node_modules
    const rules = config.module.rules.find((rule) => {
      return rule.oneOf;
    });

    if (rules && rules.oneOf) {
      // Insert our babel-loader rule before Next.js loaders
      rules.oneOf.unshift({
        test: /\.m?js$/,
        include: /node_modules\/@anthropic-ai/,
        use: {
          loader: require.resolve('babel-loader'),
          options: {
            presets: [
              [require.resolve('@babel/preset-env'), {
                targets: { node: 'current' },
                modules: false,
              }],
            ],
            plugins: [
              [require.resolve('@babel/plugin-transform-private-methods'), { loose: true }],
              [require.resolve('@babel/plugin-transform-class-properties'), { loose: true }],
              [require.resolve('@babel/plugin-transform-private-property-in-object'), { loose: true }],
            ],
          },
        },
      });
    }

    // Ignore optional keyv adapter dependencies
    config.resolve.alias = {
      ...config.resolve.alias,
      '@keyv/redis': false,
      '@keyv/mongo': false,
      '@keyv/sqlite': false,
      '@keyv/postgres': false,
      '@keyv/mysql': false,
      '@keyv/etcd': false,
      '@keyv/offline': false,
      '@keyv/tiered': false,
    };

    return config;
  },
};

module.exports = nextConfig;
