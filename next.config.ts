import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Commit desplegado (lo define Vercel); se muestra junto a la versión
  env: { NEXT_PUBLIC_COMMIT: process.env.VERCEL_GIT_COMMIT_SHA ?? "local" },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
