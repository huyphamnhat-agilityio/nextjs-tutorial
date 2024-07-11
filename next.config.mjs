/** @type {import('next').NextConfig} */

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cloudflare-ipfs.com",
      },
    ],
  },
  experimental: {
    ppr: "incremental",
  },
};

export default nextConfig;
