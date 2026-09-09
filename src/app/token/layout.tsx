import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "$SPHA",
  description: "$SPHA is the Solphia protocol token. Utilities in the stack feed automatic burns. CA coming soon.",
};

export default function TokenLayout({ children }: { children: ReactNode }) {
  return children;
}
