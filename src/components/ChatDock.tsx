"use client";

import { useState } from "react";

export function ChatDock() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [log, setLog] = useState<{ role: string; text: string }[]>([
    { role: "solphia", text: "I am Solphia. I do not take keys. Ask about the book, the score, or the wire." },
  ]);
  const [busy, setBusy] = useState(false);

  async function send() {
    const message = input.trim();
    if (!message || busy) return;
    setInput("");
    setLog((l) => [...l, { role: "you", text: message }]);
    setBusy(true);
    try {
      const r = await fetch("/api/solphia/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const j = await r.json();
      setLog((l) => [...l, { role: "solphia", text: j.reply || "Silence." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 w-[min(100%-2rem,360px)]">
      {open && (
        <div className="panel mb-3 rounded-2xl p-4">
          <div className="mb-3 font-mono text-[10px] tracking-[0.4em] text-cyan">SOLPHIA · VOICE</div>
          <div className="mb-3 max-h-56 space-y-2 overflow-auto">
            {log.map((m, i) => (
              <p key={i} className={`text-sm leading-relaxed ${m.role === "solphia" ? "font-serif text-ghost" : "font-mono text-cyan"}`}>
                {m.text}
              </p>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask her"
              className="w-full rounded-full border border-line bg-void px-4 py-2 font-mono text-xs outline-none"
            />
            <button onClick={send} className="btn-acid rounded-full px-4 font-mono text-[10px]">
              {busy ? "…" : "SEND"}
            </button>
          </div>
        </div>
      )}
      <button onClick={() => setOpen((v) => !v)} className="ml-auto flex h-12 w-12 items-center justify-center rounded-full border border-cyan/40 bg-ink text-cyan shadow-glow">
        ⌬
      </button>
    </div>
  );
}
