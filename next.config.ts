import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // Explicitly set the root so Next.js doesn't get confused by
    // multiple package-lock.json files on the Desktop
    root: path.resolve(__dirname),
  },
};

export default nextConfig;

