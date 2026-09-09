import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Token",
  description: "The Solphia protocol token. Contract address coming soon.",
};

export default function TokenLayout({ children }: { children: ReactNode }) {
  return children;
}
