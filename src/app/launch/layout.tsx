import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Autonomous desk",
  description: "Solphia trading bot is currently in construction. The token pad is offline.",
};

export default function LaunchLayout({ children }: { children: ReactNode }) {
  return children;
}
