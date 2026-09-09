"use client";

import { SphaMark } from "@/components/SphaMark";
import { useAdmin } from "./AdminProvider";

export function AdminLogin() {
  const { secret, setSecret, login, busy, err } = useAdmin();
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-5 py-16">
      <div className="mb-6 flex items-center gap-3">
        <SphaMark className="h-8 w-8" />
        <div>
          <p className="font-mono text-[11px] tracking-[0.28em] text-violet">SOLPHIA · OPS</p>
          <h1 className="font-display text-4xl text-ghost">Admin</h1>
        </div>
      </div>
      <p className="text-sm text-mute">Password only. Keys stay in Phantom.</p>
      <form
        className="mt-6 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          login();
        }}
      >
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="Password"
          autoComplete="current-password"
          autoFocus
          className="w-full rounded-full border border-violet/30 bg-void px-4 py-3 font-mono text-sm outline-none"
        />
        <button type="submit" disabled={busy || !secret} className="btn-acid w-full rounded-full py-3 text-sm disabled:opacity-40">
          {busy ? "Signing in…" : "Log in"}
        </button>
      </form>
      {err && <p className="mt-3 text-sm text-blood">{err}</p>}
    </main>
  );
}
