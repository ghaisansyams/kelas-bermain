import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

// Pin file tracing to this project so unrelated lockfiles higher up the tree
// don't confuse Next (or Vercel's tracer).
const projectRoot = dirname(fileURLToPath(import.meta.url));

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=()" },
];

const nextConfig: NextConfig = {
  outputFileTracingRoot: projectRoot,
  poweredByHeader: false,
  experimental: {
    // Server action menolak isi permintaan di atas 1 MB secara bawaan. Unggahan
    // media admin boleh 5 MB untuk gambar dan 50 MB untuk video; tanpa ini
    // unggahan yang sah gagal dengan galat yang tidak menyebut penyebabnya.
    serverActions: { bodySizeLimit: "55mb" },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    // Media diunggah dan dilayani dari server sendiri lewat /uploads — tidak
    // ada host luar yang perlu diizinkan.
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Earlier URLs stay valid — printed material may still point at them.
  async redirects() {
    return [
      { source: "/event/:slug/daftar", destination: "/register/:slug", permanent: true },
      { source: "/event/:slug/attendance", destination: "/attendance/:slug", permanent: true },
      { source: "/sertifikat/:id", destination: "/certificate/:id", permanent: true },
    ];
  },
};

export default nextConfig;
