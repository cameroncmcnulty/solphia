import type { Metadata, Viewport } from "next";
import { Syne, IBM_Plex_Mono, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { Shell } from "@/components/Shell";

const syne = Syne({ subsets: ["latin"], variable: "--font-syne" });
const plex = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex" });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-cormorant" });

export const viewport: Viewport = {
  themeColor: "#04000a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  maximumScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://solphia.io"),
  title: {
    default: "SOLPHIA — SOL vs S&P 500, Nasdaq, and gold",
    template: "%s · SOLPHIA",
  },
  description:
    "Non-custodial bot that trades SOL against official SPYx, QQQx, and GLDx. Practice first. Kill switch on. Keys stay in Phantom.",
  applicationName: "SOLPHIA",
  openGraph: {
    title: "SOLPHIA",
    description: "Add SOL. She trades official S&P 500, Nasdaq-100, and gold — or she sits.",
    url: "https://solphia.io",
    siteName: "SOLPHIA",
    images: [{ url: "/og.jpg", width: 1376, height: 768 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SOLPHIA",
    description: "Add SOL. She trades official S&P 500, Nasdaq-100, and gold — or she sits.",
    images: ["/og.jpg"],
  },
  icons: {
    icon: [
      { url: "/favicon.png?v=3", type: "image/png", sizes: "64x64" },
      { url: "/icon-192.png?v=3", type: "image/png", sizes: "192x192" },
    ],
    apple: [{ url: "/apple-touch-icon.png?v=3", sizes: "180x180" }],
    shortcut: "/favicon.png?v=3",
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
      <body className={`${syne.variable} ${plex.variable} ${cormorant.variable} font-sans antialiased`}>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
