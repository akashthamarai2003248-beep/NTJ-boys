import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Allow local preview clients (e.g. embedded webviews) in dev.
     Production traffic is unaffected. */
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
