import type { NextConfig } from "next";

/**
 * Static export config for GitHub Pages.
 *
 * The site is deployed at https://balinti.github.io/parasha-daily/, so we need
 * `basePath: "/parasha-daily"` so internal links and assets resolve under that
 * prefix. Local dev / Vercel deploys can override via BASE_PATH="".
 */
const basePath = process.env.BASE_PATH ?? "/parasha-daily";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  // GitHub Pages serves directory paths as `<dir>/index.html`. Trailing slash
  // makes Next emit those.
  trailingSlash: true,
  // No <Image> optimizer in a static export.
  images: { unoptimized: true },
  // Surface the basePath to the client (used to build absolute URLs).
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
