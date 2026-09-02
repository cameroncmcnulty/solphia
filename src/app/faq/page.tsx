import Link from "next/link";
import { FaqList } from "@/components/FaqList";
import { LiveStats } from "@/components/LiveStats";

export default function FaqPage() {
  return (
    <main className="pb-12">
      <LiveStats compact />
      <div className="mx-auto max-w-3xl px-4 pt-8 md:px-8">
        <p className="text-base text-acid">FAQ</p>
        <h1 className="mt-2 font-display text-4xl text-ghost sm:text-5xl">Plain answers.</h1>
        <p className="mt-4 text-lg text-mute">Short questions. Short answers.</p>
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
