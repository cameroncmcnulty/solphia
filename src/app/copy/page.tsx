import Link from "next/link";
import { WalletDesk } from "@/components/WalletDesk";

export default function CopyPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-4 md:px-8">
      <p className="text-base text-acid">Copy</p>
      <h1 className="mt-2 font-display text-3xl text-ghost sm:text-5xl">Who she copies</h1>
      <p className="mt-3 max-w-2xl text-base text-mute sm:text-lg">
        Quality this week. Visible setups only. She always copies the sell.
      </p>
      <div className="mt-6">
        <WalletDesk />
      </div>
      <div className="mt-8">
        <Link
          href="/trading"
          className="btn-acid inline-flex min-h-[52px] items-center justify-center rounded-full px-8 py-3 text-base"
        >
          LAUNCH BOT
        </Link>
      </div>
    </main>
  );
}
