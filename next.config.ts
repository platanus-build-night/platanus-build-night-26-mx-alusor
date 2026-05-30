import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Include the agent contracts (read at runtime by src/ai/*) in the
  // serverless output trace so they ship to Vercel.
  outputFileTracingIncludes: {
    "/api/**": ["./spec/**/*"],
  },
};

export default nextConfig;
