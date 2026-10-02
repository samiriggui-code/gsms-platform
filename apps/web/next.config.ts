import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Image Docker autonome (apps/web/Dockerfile) : seul .next/standalone est copié.
  output: "standalone",
  poweredByHeader: false,
  // Le navigateur ne parle qu'au Core, et uniquement via nos route handlers :
  // aucune URL d'app spécialisée n'est exposée côté client.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
