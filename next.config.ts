import type { NextConfig } from "next";

// Skip SSL verification in development (for corporate networks/proxies)
if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

