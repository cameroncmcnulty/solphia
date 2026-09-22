import type { Metadata } from "next";
import { TradingHub } from "@/components/TradingHub";

export const metadata: Metadata = {
  title: "Autonomous desk",
  description: "In testing. Backtest is public. Live clips stay in admin until the book holds.",
};

export default function TradingPage() {
  return <TradingHub />;
}
