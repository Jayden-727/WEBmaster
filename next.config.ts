import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  serverExternalPackages: ["turndown", "cheerio", "lighthouse", "chrome-launcher"],
};

export default nextConfig;
