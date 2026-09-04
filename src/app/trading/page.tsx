import type { Metadata } from "next";
import { TradingHub } from "@/components/TradingHub";

export const metadata: Metadata = {
  title: "Trading",
  description: "Operate Solphia. Connect Phantom or Solflare, fund SOL, paper-trade SOL vs official SPYx.",
};

export default function TradingPage() {
  return <TradingHub />;
}
