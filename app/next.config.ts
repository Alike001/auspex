import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Production hardening: don't advertise the framework, keep strict checks on.
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
