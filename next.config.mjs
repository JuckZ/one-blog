/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    SITE_ENGINE: process.env.SITE_ENGINE ?? "next",
  },
  outputFileTracingIncludes: process.env.SITE_ENGINE === "quartz"
    ? { "/quartz-render": ["./.quartz-output/**/*"] }
    : undefined,
  outputFileTracingExcludes: { "/*": ["./posts/**/*"] },
  poweredByHeader: false,
};

export default nextConfig;
