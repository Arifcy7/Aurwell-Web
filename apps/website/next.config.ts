import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.107", "192.168.0.*", "192.168.1.*", "*.local"],
  turbopack: {
    root: path.resolve(__dirname, "../../"),
    resolveAlias: {
      swr: "swr/dist/index/index.mjs",
    },
  },
  serverExternalPackages: ["sanity"],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "clsx", "tailwind-merge"],
  },
};

export default nextConfig;
