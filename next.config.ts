import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure the Getting Started markdown is bundled into the /guide serverless
  // function (it's read at runtime via fs in app/guide/page.tsx).
  outputFileTracingIncludes: {
    '/guide': ['./content/getting-started.md'],
  },
};

export default nextConfig;
