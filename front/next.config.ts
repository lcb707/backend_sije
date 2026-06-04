import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker standalone 빌드 (이미지 최소화)
  output: "standalone",
};

export default nextConfig;
