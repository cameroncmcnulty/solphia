import type { Metadata } from "next";
import { TradingHub } from "@/components/TradingHub";

export const metadata: Metadata = {
  title: "Trading",
  description: "Operate Solphia. Connect Phantom, add SOL, let her trade official SPYx, QQQx, and GLDx.",
};

export default function TradingPage() {
  return <TradingHub />;
}
