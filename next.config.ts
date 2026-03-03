import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Local images from public/ work without domains config
    // but we set formats for performance
    formats: ["image/webp"],
  },
};

export default nextConfig;
