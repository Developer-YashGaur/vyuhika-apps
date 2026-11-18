import type { NextConfig } from "next";

// Basic browser protections, sent with every page. (A full Content-Security-Policy is left out for now: Google Tag
// Manager and the analytics scripts need a carefully tested policy, and a wrong one would break the site.)
export const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }, // always use https
  { key: "X-Content-Type-Options", value: "nosniff" }, // browsers must not guess file types
  { key: "X-Frame-Options", value: "DENY" }, // no other site may show ours in a frame (clickjacking)
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }, // other sites only see our domain, not full links
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self)" }, // no camera, microphone or location
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  // Referral requests upload a resume (up to 2 MB) with the form, and the default limit is 1 MB.
  experimental: {
    serverActions: { bodySizeLimit: "3mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
