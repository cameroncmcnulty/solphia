import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "$SPHA",
  description: "Solphia is a utility token on Solana. Official $SPHA TGE Thursday Nov 12, 2026 at 4:00 PM MST.",
};

export default function TokenLayout({ children }: { children: ReactNode }) {
  return children;
}
