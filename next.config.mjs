/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ["next-auth", "zod"],
  },
};

export default nextConfig;
