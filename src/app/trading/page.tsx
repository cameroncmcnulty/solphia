import type { Metadata } from "next";
import { TradingHub } from "@/components/TradingHub";

export const metadata: Metadata = {
  title: "Trading",
  description: "Operate Solphia. Connect a wallet, set size and safety, start the paper bot.",
};

export default function TradingPage() {
  return <TradingHub />;
}
