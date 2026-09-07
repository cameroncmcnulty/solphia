export default function LegalPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 pb-24">
      <h1 className="font-display text-4xl text-ghost">Fine print</h1>
      <div className="mt-6 space-y-4 text-base leading-relaxed text-mute">
        <p>Solphia never asks for your seed phrase. Your trading key stays on your phone or computer.</p>
        <p>
          Right now the bot paper-trades SOL, USDC, official SPYx, QQQx, and GLDx against each other so you can watch her
          work. Profit is marked in USDC. Real swaps stay off until you flip to real trades. You sign every live
          transaction.
        </p>
        <p>
          These tokens are not the New York print. Issuer and custody risk. After hours and weekends they can move
          while the cash market is closed. You can lose SOL. This is not financial advice.
        </p>
        <p>Paper is free. Live is 0.2 SOL / 30 days plus a 0.1% fee on each clip. Spot only in v1 — no leverage.</p>
      </div>
    </main>
  );
}
