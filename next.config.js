
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Load @react-pdf/renderer via native Node.js require instead of bundling it.
  // This keeps the package outside Turbopack/webpack's module graph so its
  // internal react-reconciler always uses the same React instance as the
  // project, preventing Minified React error #31.
  serverExternalPackages: ['@react-pdf/renderer'],

  // Empty turbopack config — suppresses the "webpack config present but no
  // turbopack config" error that Next.js 16 emits.  Turbopack does not alias
  // react to its own compiled React 19 canary the way webpack does, so no
  // resolveAlias override is needed here.
  turbopack: {},

  // Webpack fallback — only active when running with --webpack flag.
  // Overrides react/jsx-runtime to the project's React 18 so that
  // @react-pdf/renderer receives Symbol.for('react.element') elements (React
  // 19 would produce Symbol.for('react.transitional.element') instead).
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        react: require.resolve('react'),
        'react/jsx-runtime': require.resolve('react/jsx-runtime'),
        'react/jsx-dev-runtime': require.resolve('react/jsx-dev-runtime'),
      };
    }
    return config;
  },
};

module.exports = nextConfig;
