/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['*.e2b.app'],
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
