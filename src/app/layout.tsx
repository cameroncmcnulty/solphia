import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Syne, IBM_Plex_Mono, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { Shell } from "@/components/Shell";
import { OWNER_HYDRATE_SCRIPT } from "@/lib/wallet/owner";
import { isReservedV3Host, v3HostFromHeader } from "@/lib/tools/v3/host";

const syne = Syne({ subsets: ["latin"], variable: "--font-syne" });
const plex = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex" });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-cormorant" });

export const viewport: Viewport = {
  themeColor: "#04000a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  maximumScale: 1,
  interactiveWidget: "resizes-content",
};

const SOLPHIA_METADATA: Metadata = {
  metadataBase: new URL("https://solphia.io"),
  title: {
    default: "SOLPHIA",
    template: "%s · SOLPHIA",
  },
  description: "solphia.io",
  applicationName: "SOLPHIA",
  openGraph: {
    title: "SOLPHIA",
    description: "solphia.io",
    url: "https://solphia.io",
    siteName: "SOLPHIA",
    images: [{ url: "/og.jpg?v=7", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SOLPHIA",
    description: "solphia.io",
    images: ["/og.jpg?v=7"],
  },
  icons: {
    icon: [
      { url: "/favicon.png?v=5", type: "image/png", sizes: "64x64" },
      { url: "/icon-192.png?v=5", type: "image/png", sizes: "192x192" },
    ],
    apple: [{ url: "/apple-touch-icon.png?v=5", sizes: "180x180" }],
    shortcut: "/favicon.png?v=5",
  },
  appleWebApp: {
    capable: true,
    title: "SOLPHIA",
    statusBarStyle: "black-translucent",
  },
  manifest: "/site.webmanifest",
};

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const marked = (h.get("x-v3-handle") || "").trim().toLowerCase();
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  const sub = marked || v3HostFromHeader(host);
  const memeHost = Boolean(sub && !isReservedV3Host(sub) && !sub.includes("."));
  if (memeHost) {
    return {
      metadataBase: new URL("https://solphia.io"),
      robots: { index: false, follow: false },
    };
  }
  return SOLPHIA_METADATA;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const marked = (h.get("x-v3-handle") || "").trim().toLowerCase();
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  const sub = marked || v3HostFromHeader(host);
  const memeHost = Boolean(sub && !isReservedV3Host(sub) && !sub.includes("."));
  if (memeHost) {
    return (
      <html lang="en">
        <body className="antialiased">{children}</body>
      </html>
    );
  }
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: OWNER_HYDRATE_SCRIPT }} />
      </head>
      <body className={`${syne.variable} ${plex.variable} ${cormorant.variable} font-sans antialiased`}>
        <Shell memeHost={false}>{children}</Shell>
      </body>
    </html>
  );
}
