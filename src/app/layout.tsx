import type { Metadata, Viewport } from "next";
import { Syne, IBM_Plex_Mono, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { Shell } from "@/components/Shell";
import { OWNER_HYDRATE_SCRIPT } from "@/lib/wallet/owner";

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

export const metadata: Metadata = {
  metadataBase: new URL("https://solphia.io"),
  title: {
    default: "SOLPHIA — Launch. Shill. Swap.",
    template: "%s · SOLPHIA",
  },
  description:
    "Launch on Meteora. Shill Zone. Swap. $SPHA. Phantom signs. Nothing is custodial.",
  applicationName: "SOLPHIA",
  openGraph: {
    title: "SOLPHIA",
    description: "Launch on Meteora. Shill Zone. Swap. $SPHA. Phantom signs. Nothing is custodial.",
    url: "https://solphia.io",
    siteName: "SOLPHIA",
    images: [{ url: "/og.jpg?v=6", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SOLPHIA",
    description: "Launch on Meteora. Shill Zone. Swap. $SPHA. Phantom signs. Nothing is custodial.",
    images: ["/og.jpg?v=6"],
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: OWNER_HYDRATE_SCRIPT }} />
      </head>
      <body className={`${syne.variable} ${plex.variable} ${cormorant.variable} font-sans antialiased`}>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
