/** @type {import('next').NextConfig} */
const nextConfig = {
  // Compile the shared workspace package (it ships TS, not built JS).
  transpilePackages: ["@crm/core"],
};
export default nextConfig;
