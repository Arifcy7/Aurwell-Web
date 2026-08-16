import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.107", "192.168.0.*", "192.168.1.*", "*.local"],
  turbopack: {
    root: path.resolve(__dirname, "../../"),
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "clsx", "tailwind-merge"],
  },
};

export default nextConfig;
