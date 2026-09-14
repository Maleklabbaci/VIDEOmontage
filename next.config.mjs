/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['*.e2b.app'],
  serverExternalPackages: ['ffmpeg-static'],
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
