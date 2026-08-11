/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pure static export. No server features: no API routes, no ISR, no middleware.
  output: "export",
  // Emit /reports/<slug>/index.html so report URLs serve as directories on any
  // static host, and relative links inside a report resolve predictably.
  trailingSlash: true,
  // The image optimizer is a server feature; the site ships plain <img>/SVG.
  images: { unoptimized: true },
};

export default nextConfig;
