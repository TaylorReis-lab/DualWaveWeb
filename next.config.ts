import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Usado pelo Dockerfile e pelo comando scripts/run-local.mjs start.
  output: "standalone",
};

export default nextConfig;
