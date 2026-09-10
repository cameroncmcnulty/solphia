"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useOwner } from "@/lib/hooks";
import { isSolanaAddress } from "@/lib/wallet/addr";

const KEY = "solphia_ref";

export function peekRef(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function saveRef(code: string) {
  const v = (code || "").trim();
  if (!v) return;
  try {
    localStorage.setItem(KEY, v);
  } catch {
    /* ignore */
  }
}

export function ReferralCapture() {
  const params = useSearchParams();
  const owner = useOwner();

  useEffect(() => {
    const q = params.get("ref") || "";
    if (q) saveRef(q);
  }, [params]);

  useEffect(() => {
    if (!owner) return;
    const referrer = peekRef();
    fetch("/api/account", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "hello", pubkey: owner, referrer: referrer || undefined }),
    }).catch(() => {});
  }, [owner]);

  return null;
}

export function validRef(raw?: string | null) {
  return Boolean(raw && isSolanaAddress(raw));
}
