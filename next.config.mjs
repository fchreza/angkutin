/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        // Neon Object Storage (bucket public_read) — foto listing
        protocol: "https",
        hostname: "**.storage.c-4.ap-southeast-1.aws.neon.tech",
      },
      {
        protocol: "https",
        hostname: "**.aws.neon.tech",
      },
    ],
  },
};

export default nextConfig;
