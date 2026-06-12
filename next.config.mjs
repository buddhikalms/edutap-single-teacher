/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb"
    }
  }
};

export default nextConfig;
