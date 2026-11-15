import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  reactCompiler: true,
  // English and French have a root layout each, so the 404 page is app/global-not-found.tsx.
  experimental: { globalNotFound: true },
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        // `as: "*.css"` would strip CSS Modules of their class mapping.
        condition: { not: { path: /\.module\.css$/ } },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
