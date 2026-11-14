/** Public community page so sniper website checks get HTTP 200 instead of a dead /c/handle. */

export default async function CommunityHandlePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const raw = (handle || "").replace(/[^a-zA-Z0-9_]/g, "").slice(0, 24);
  const ticker = (raw || "COIN").toUpperCase().slice(0, 10);
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6 text-center">
      <div>
        <div className="font-mono text-[10px] tracking-[0.3em] text-mute">COMMUNITY COIN</div>
        <h1 className="mt-3 font-display text-5xl text-ghost">${ticker}</h1>
        <p className="mt-3 text-sm text-mute">${ticker} community coin.</p>
      </div>
    </main>
  );
}
