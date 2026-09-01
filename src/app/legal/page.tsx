export default function LegalPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 pb-24">
      <h1 className="font-display text-4xl text-ghost">Fine print</h1>
      <div className="mt-6 space-y-4 text-base leading-relaxed text-mute">
        <p>Solphia never asks for your seed phrase. Your trading key stays on your phone or computer.</p>
        <p>
          Right now the bot paper-trades live coins so you can see if it would have made money. Real swaps stay off
          until live trading is switched on.
        </p>
        <p>
          Memecoins can go to zero. Most new coins die the day they launch. A good week on the demo book is not a
          promise. This is not financial advice.
        </p>
        <p>
          Alerts are 0.15 SOL / 30 days. Copy bot 0.25. Launch bot 0.30. Everything 0.50. When live trades run, the
          take is 0.35% per fill.
        </p>
      </div>
    </main>
  );
}
