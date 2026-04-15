/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Align with upload route MAX_FILE_SIZE (~4.5MB) + multipart overhead (some hosts parse multipart with this cap)
      bodySizeLimit: '5mb',
    },
  },
};

export default nextConfig;
