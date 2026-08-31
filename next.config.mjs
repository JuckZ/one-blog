/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    SITE_ENGINE: process.env.SITE_ENGINE ?? "next",
  },
  experimental:
    process.env.SITE_ENGINE === "quartz"
      ? {
          outputFileTracingIncludes: {
            "/*": ["./.quartz-output/**/*"],
          },
        }
      : undefined,
  poweredByHeader: false,
};

export default nextConfig;
