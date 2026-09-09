import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "$SPHA",
  description: "$SPHA is the Solphia protocol token. Every swap funds listings, buybacks, and burns. CA coming soon.",
};

export default function TokenLayout({ children }: { children: ReactNode }) {
  return children;
}
