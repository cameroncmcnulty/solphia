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
