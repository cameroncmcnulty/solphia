"use client";

import { useCallback, useEffect, useState } from "react";

export function useMarket(pollMs = 15000) {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/feed", { cache: "no-store" });
      if (!r.ok) throw new Error("feed " + r.status);
      setData(await r.json());
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "feed failed");
    } finally {
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
    try {
      return localStorage.getItem("solphia_owner");
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const sync = () => {
      try {
        setOwner(localStorage.getItem("solphia_owner"));
      } catch {
        setOwner(null);
      }
    };
    sync();
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<string | null>).detail;
      setOwner(detail || localStorage.getItem("solphia_owner"));
    };
    window.addEventListener("solphia-owner", onCustom as EventListener);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("solphia-owner", onCustom as EventListener);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return owner;
}
