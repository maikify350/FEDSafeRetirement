const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
const isStaticExport = process.env.BUILD_STATIC_EXPORT === "1";

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath,
  output: isStaticExport ? "export" : undefined,
  trailingSlash: isStaticExport,
  images: {
    unoptimized: true
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath
  }
};

module.exports = nextConfig;
