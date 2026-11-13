import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "$SPHA",
  description: "Solphia is a utility token on Solana.",
};

export default function TokenLayout({ children }: { children: ReactNode }) {
  return children;
}
