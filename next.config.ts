import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this app so Next doesn't walk up to the
  // home directory (which triggers the "ignored package-lock.json" warning).
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
