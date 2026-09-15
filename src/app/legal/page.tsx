import Link from "next/link";

export default function LegalPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 pb-24">
      <h1 className="font-display text-4xl text-ghost">Fine print</h1>
      <div className="mt-6 space-y-4 text-base leading-relaxed text-mute">
        <p>Solphia never asks for your seed phrase. Your trading key stays on your phone or computer.</p>
        <p>
          Your wallet is login. When you add SOL, it goes to a trading wallet on this device. It stays there until you
          hit KILL and withdraw. We never hold that key. Clearing this browser without a backup can make funds
          unrecoverable.
        </p>
        <p>
          She trades tokenized S&P 500, Nasdaq, gold, and SOL. Practice is on until you flip to live. Live swaps are
          signed by the trading wallet on this device — not by us. You can lose SOL. This is not financial advice.
        </p>
        <h2 className="pt-4 font-display text-2xl text-ghost">Live seat</h2>
        <p>
          Live is 0.1 SOL / 30 days. SOL 2×/3× is 0.15 SOL / 30 days. Leverage can liquidate. By checking
          “I agree” you authorize the transfer.
        </p>
        <p>
          First payment is signed in your wallet. Later months renew from the trading wallet while solphia.io is open,
          until you unsubscribe. If the site is closed when a month is due, the seat expires and live flips back to
          practice.
        </p>
        <p>
          Unsubscribe any time. Access stays until the date you already paid through. We do not refund a started
          30-day window.
        </p>
        <p>
          Keep a little spare SOL in the trading wallet for the monthly seat and network fees. If that wallet is short,
          pay again on the pricing page.
        </p>
        <p>
          <Link href="/pricing" className="text-acid">
            Back to pricing
          </Link>
        </p>
      </div>
    </main>
  );
}
