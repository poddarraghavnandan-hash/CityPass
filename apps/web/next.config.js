/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@citypass/db',
    '@citypass/types',
    '@citypass/utils',
    '@citypass/llm',
    '@citypass/search',
    '@citypass/analytics',
    '@citypass/social',
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Externalize Anthropic SDK and OpenAI SDK to avoid bundling issues
  serverExternalPackages: ['@anthropic-ai/sdk', 'openai'],
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

    return config;
  },
};

module.exports = nextConfig;
