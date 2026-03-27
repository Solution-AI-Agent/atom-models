import type { NextConfig } from "next";

const apiUrl = process.env.INTERNAL_API_URL || "http://localhost:3000";
const isCloudflare = process.env.CF_PAGES === "1";

const nextConfig: NextConfig = {
  // standalone output is for Docker (Railway); skip for Cloudflare Pages
  ...(!isCloudflare && { output: "standalone" }),
  images: { unoptimized: true },
  // Cloudflare에서만 API를 Railway 백엔드로 프록시
  ...(isCloudflare && {
    rewrites: async () => [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ],
  }),
};

export default nextConfig;
