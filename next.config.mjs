/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: '.next-build',
  turbopack: {
    root: process.cwd(),
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
