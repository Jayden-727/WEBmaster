import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  serverExternalPackages: ["turndown", "cheerio", "lighthouse", "chrome-launcher", "playwright-core"],
};

export default nextConfig;
