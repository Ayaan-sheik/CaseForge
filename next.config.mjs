/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // These must run as Node dependencies, not be bundled. @react-pdf/renderer
    // for the short-form PDF; the puppeteer/chromium stack for the long-form
    // HTML→PDF path (puppeteer is dev-only and only imported in local dev).
    serverComponentsExternalPackages: [
      '@react-pdf/renderer',
      'puppeteer-core',
      'puppeteer',
    ],
  },
};

export default nextConfig;
