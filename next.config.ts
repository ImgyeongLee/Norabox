import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Self-hosted fonts (public/fonts). Their paths carry a version (v1), so a change ships
        // under a new path; browsers can keep these for a year without checking back.
        source: "/fonts/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
