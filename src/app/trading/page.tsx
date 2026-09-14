import type { Metadata } from "next";
import { TradingHub } from "@/components/TradingHub";

export const metadata: Metadata = {
  title: "Trading",
  description: "Turn her on. She trades tokenized S&P 500, Nasdaq, and gold.",
};

export default function TradingPage() {
  return <TradingHub />;
}
