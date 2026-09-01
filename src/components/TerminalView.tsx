import { Suspense } from "react";
import { TerminalClient } from "./TerminalClient";

export function TerminalView({ forcedDesk }: { forcedDesk?: string }) {
  return (
    <Suspense fallback={<div className="px-8 py-16 font-mono text-mute">Booting desk…</div>}>
      <TerminalClient forcedDesk={forcedDesk} />
    </Suspense>
  );
}
