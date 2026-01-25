/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'source.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'unsplash.com',
        pathname: '/**',
      },
    ],
    unoptimized: false, // Enable Next.js image optimization
  },
  webpack: (config, { isServer }) => {
    // Exclude native modules from webpack bundling
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'onnxruntime-node': 'commonjs onnxruntime-node',
        'sharp': 'commonjs sharp',
        '@xenova/transformers': 'commonjs @xenova/transformers',
      });
    }
    
    // Ignore native binary files and sharp
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /\.node$/,
      use: 'ignore-loader',
    });
    
    // Ignore sharp and transformers modules completely
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias['sharp'] = false;
    config.resolve.alias['@xenova/transformers'] = false;
    
    // Ignore embeddings.ts if it tries to import transformers
    config.resolve.alias['./embeddings'] = false;
    config.resolve.alias['@/app/lib/recommend/embeddings'] = false;

    return config;
  },
};

module.exports = nextConfig;

