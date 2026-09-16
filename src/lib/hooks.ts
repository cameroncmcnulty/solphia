"use client";

import { useCallback, useEffect, useState } from "react";
import { loadOwner, OWNER_EVENT } from "@/lib/wallet/owner";

export function useMarket(pollMs = 15000) {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12_000);
    try {
      const r = await fetch("/api/feed", { cache: "no-store", signal: ctrl.signal });
      if (!r.ok) throw new Error("feed " + r.status);
      const j = await r.json();
      if (j && (j.paper || j.pair)) {
        setData(j);
        setErr(null);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "feed failed");
    } finally {
      clearTimeout(t);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, pollMs);
    return () => clearInterval(id);
  }, [refresh, pollMs]);

  return { data, err, loading, refresh };
}

export function useOwner() {
  const [owner, setOwner] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return loadOwner();
  });

  useEffect(() => {
    const sync = () => setOwner(loadOwner());
    sync();
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<string | null>).detail;
      setOwner(detail || loadOwner());
    };
    window.addEventListener(OWNER_EVENT, onCustom as EventListener);
    window.addEventListener("storage", sync);
    window.addEventListener("pageshow", sync);
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.removeEventListener(OWNER_EVENT, onCustom as EventListener);
      window.removeEventListener("storage", sync);
      window.removeEventListener("pageshow", sync);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return owner;
}
