import type { Metadata, Viewport } from "next";
import { Syne, IBM_Plex_Mono, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { Shell } from "@/components/Shell";

const syne = Syne({ subsets: ["latin"], variable: "--font-syne" });
const plex = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex" });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-cormorant" });

export const viewport: Viewport = {
  themeColor: "#050308",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://solphia.io"),
  title: {
    default: "SOLPHIA — Solana memecoin terminal",
    template: "%s · SOLPHIA",
  },
  description:
    "Non-custodial Solana memecoin terminal. Copy, launch sniper, migration sniper, safety score 0–100, 0.35% fee, 0.15 SOL / month. Paper trading until Helius goes live.",
  applicationName: "SOLPHIA",
  openGraph: {
    title: "SOLPHIA",
    description: "She runs the book. You keep the keys.",
    url: "https://solphia.io",
    siteName: "SOLPHIA",
    images: [{ url: "/og.jpg", width: 1376, height: 768 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SOLPHIA",
    description: "She runs the book. You keep the keys.",
    images: ["/og.jpg"],
  },
  icons: { icon: "/favicon.svg" },
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
