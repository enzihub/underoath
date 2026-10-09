/** @type {import('next').NextConfig} */
// Static export. Set NEXT_PUBLIC_BASE_PATH when the game is served from a
// sub-path (the GitHub Pages build uses /underoath/play).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
    output: 'export',
    distDir: 'dist',
    trailingSlash: true,
    basePath,
    assetPrefix: basePath || undefined,
    images: { unoptimized: true },
    eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
