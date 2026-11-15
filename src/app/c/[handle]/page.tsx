/** Public community page so sniper website checks get HTTP 200 instead of a dead /c/handle. */
import { SNIPER_TELEGRAM, SNIPER_X } from "@/lib/tools/identities";

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
        <div className="font-mono text-[10px] tracking-[0.3em] text-mute">COMMUNITY</div>
        <h1 className="mt-3 font-display text-5xl text-ghost">${ticker}</h1>
        <p className="mt-3 text-sm text-mute">${ticker} on Solphia.</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 font-mono text-[11px]">
          <a href={SNIPER_X} target="_blank" rel="noreferrer" className="text-acid hover:underline">
            X
          </a>
          <a href={SNIPER_TELEGRAM} target="_blank" rel="noreferrer" className="text-acid hover:underline">
            Telegram
          </a>
          <a href="https://solphia.io" className="text-acid hover:underline">
            solphia.io
          </a>
        </div>
      </div>
    </main>
  );
}
