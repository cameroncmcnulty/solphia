export default function LegalPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 pb-24">
      <h1 className="font-display text-5xl text-ghost">Legal</h1>
      <div className="mt-6 space-y-4 font-serif text-lg text-mute">
        <p>Solphia is a non-custodial interface. We never ask for, store, or transmit a private key or seed phrase.</p>
        <p>This build is in testing. Fills are paper trades against live market events. They are not executed on-chain until live trading is explicitly enabled and Helius is connected.</p>
        <p>Memecoins are extremely high risk. Most Pump.fun tokens die on launch day. Past paper PnL is not a promise of future returns. Nothing here is financial advice.</p>
        <p>Subscription is 0.15 SOL per 30 days for alerts and premium signals. Trading fee, when live, is 0.35% of notional.</p>
      </div>
    </main>
  );
}
