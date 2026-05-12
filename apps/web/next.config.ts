import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  /** Monorepo: trace from repository root (cwd is apps/web during build). */
  outputFileTracingRoot: path.resolve(process.cwd(), "../.."),
};

export default nextConfig;
