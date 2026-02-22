/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    optimizePackageImports: ["next-auth", "zod"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "unsplash.com",
      },
      {
        protocol: "https",
        hostname: "randomuser.me",
      },
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
      {
        protocol: "https",
        hostname: "ui-avatars.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "maps.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "places.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "303magazine.com",
      },
      {
        protocol: "https",
        hostname: "images.303magazine.com",
      },
      {
        protocol: "https",
        hostname: "assets0.dostuffmedia.com",
      },
      {
        protocol: "https",
        hostname: "assets1.dostuffmedia.com",
      },
      {
        protocol: "https",
        hostname: "www.westword.com",
      },
      {
        protocol: "https",
        hostname: "media.westword.com",
      },
    ],
  },
};

export default nextConfig;
