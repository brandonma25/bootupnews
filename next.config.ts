import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/technology",
        destination: "/",
        permanent: false,
      },
      {
        source: "/economics",
        destination: "/",
        permanent: false,
      },
      {
        source: "/politics",
        destination: "/",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
