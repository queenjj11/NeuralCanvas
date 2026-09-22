import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // three.js ships untranspiled ESM examples; Next handles them via transpile.
  transpilePackages: ["three"],
};

export default nextConfig;
