import type { Metadata } from "next";
// Self-hosted typefaces (no external requests; see vendor/design-system/VENDORED.md).
import "@fontsource-variable/newsreader";
import "@fontsource-variable/newsreader/wght-italic.css";
import "@fontsource-variable/public-sans";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://colophon.claims"),
  title: {
    default: "Colophon — publish claims people can check",
    template: "%s — Colophon",
  },
  description: "Publish benchmark claims people can check.",
  icons: { icon: "/brand/favicon.svg" },
  openGraph: {
    siteName: "Colophon",
    type: "website",
    images: ["/brand/logo-lockup.svg"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
