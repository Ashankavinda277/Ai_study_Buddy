import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits .next/standalone with a self-contained server.js and only the
  // node_modules actually reached at runtime. The Dockerfile copies that
  // instead of the full dependency tree, which is the difference between a
  // ~200MB runtime image and a ~1GB one.
  output: "standalone",
};

export default nextConfig;
