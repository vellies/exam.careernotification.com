import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/admin/login", destination: "/login", permanent: true },
      { source: "/dashboard", destination: "/overview", permanent: true },
      { source: "/dashboard/tests", destination: "/series", permanent: true },
      { source: "/dashboard/tests/:testId/attempt", destination: "/tests/:testId/attempt", permanent: true },
      { source: "/dashboard/results/:path*", destination: "/my-results/:path*", permanent: true },
      { source: "/dashboard/:path*", destination: "/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
