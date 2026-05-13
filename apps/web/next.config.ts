import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  /** Monorepo: trace from repository root (cwd is apps/web during build). */
  outputFileTracingRoot: path.resolve(process.cwd(), "../.."),
  experimental: {
    serverActions: {
      /** Multipart image uploads via Server Actions exceed the default 1 MB. */
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
