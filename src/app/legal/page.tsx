import Link from "next/link";

export default function LegalPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 pb-24">
      <h1 className="font-display text-4xl text-ghost">Fine print</h1>
      <div className="mt-6 space-y-4 text-base leading-relaxed text-mute">
        <p>Solphia never asks for your seed phrase. Your trading key stays on your phone or computer.</p>
        <p>
          Phantom is your login. When you add SOL, that SOL is sent on-chain to a trading wallet generated on this
          device. It sits there until you hit KILL and withdraw back to Phantom. We never hold that key. Clearing this
          browser without a backup of the trading key can make those funds unrecoverable.
        </p>
        <p>
          Right now the bot paper-trades SOL, USDC, official SPYx, QQQx, and GLDx against each other so you can watch
          her work. Profit is marked in USDC. Real swaps stay off until live trading is on and you flip to real trades.
          Live swaps are signed by the trading wallet on this device — not by us.
        </p>
        <p>
          These tokens are not the New York print. Issuer and custody risk. After hours and weekends they can move
          while the cash market is closed. You can lose SOL. This is not financial advice. Spot only — no leverage.
        </p>
        <h2 className="pt-4 font-display text-2xl text-ghost">Live seat</h2>
        <p>
          Paper is free. Live is 0.1 SOL every 30 days plus a 0.1% fee on each clip, paid to the Solphia treasury. By
          checking “I agree” on the pricing page you authorize that transfer.
        </p>
        <p>
          The first 0.1 SOL is signed in Phantom. Later months are signed by the trading wallet on this device while
          solphia.io is open, until you unsubscribe. If the site is closed when a month is due, we cannot pull SOL —
          the seat simply expires at the paid-through date and live flips back to practice.
        </p>
        <p>
          Unsubscribe any time. Access stays until the date you already paid through. We do not refund a started
          30-day window.
        </p>
        <p>
          Keep a little spare SOL in the trading wallet for the monthly seat and network fees. If that wallet is short,
          pay again from Phantom on the pricing page.
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
