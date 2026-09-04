export default function LegalPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 pb-24">
      <h1 className="font-display text-4xl text-ghost">Fine print</h1>
      <div className="mt-6 space-y-4 text-base leading-relaxed text-mute">
        <p>Solphia never asks for your seed phrase. Your trading key stays on your phone or computer.</p>
        <p>
          Right now the bot paper-trades SOL against official tokenized S&P 500 (SPYx / xStocks) so you can see the
          ratio tape. Real swaps stay off until live trading is switched on. You sign every live transaction.
        </p>
        <p>
          Tokenized SPY is not the NYSE print. Issuer and custody risk. After hours and weekends the token can move
          while cash SPY is closed. You can lose SOL. This is not financial advice.
        </p>
        <p>Paper is free. A simple 0.15 SOL / 30 days live seat comes later. Spot only in v1 — no leverage.</p>
      </div>
    </main>
  );
}
