import Link from "next/link";
import { FaqList } from "@/components/FaqList";
import { LiveStats } from "@/components/LiveStats";

export default function FaqPage() {
  return (
    <main className="pump-shell">
      <LiveStats compact />
      <div className="pump-wrap">
        <p className="text-[13px] font-medium text-[#14f195]">FAQ</p>
        <h1 className="pump-h1 mt-2">Plain answers.</h1>
        <p className="pump-p mt-3">Short questions. Short answers.</p>
        <div className="mt-8">
          <FaqList />
        </div>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/trading" className="btn-acid inline-flex min-h-[48px] items-center justify-center rounded-full px-6 py-3 text-center font-mono text-xs">
            LAUNCH BOT
          </Link>
          <Link href="/pricing" className="btn-ghost inline-flex min-h-[48px] items-center justify-center rounded-full px-6 py-3 text-center font-mono text-xs">
            Compare plans
          </Link>
        </div>
      </div>
    </main>
  );
}
