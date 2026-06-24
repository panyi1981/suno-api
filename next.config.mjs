/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    config.module.rules.push({
      test: /\.(ttf|html)$/i,
      type: 'asset/resource'
    });
    if (isServer) {
      // Playwright pulls optional electron support; we only use Chromium on the server.
      config.resolve.alias = {
        ...config.resolve.alias,
        electron: false,
      };
    }
    return config;
  },
  experimental: {
    serverMinification: false, // the server minification unfortunately breaks the selector class names
    serverComponentsExternalPackages: [
      'rebrowser-playwright-core',
      'playwright-core',
      '@playwright/browser-chromium',
      'ghost-cursor-playwright',
    ],
  },
};

export default nextConfig;
