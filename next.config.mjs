/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // @react-pdf/renderer must run as a Node dependency, not be bundled
    serverComponentsExternalPackages: ['@react-pdf/renderer'],
  },
};

export default nextConfig;
