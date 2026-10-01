/** Last Jupiter swap result. Survives Phantom UL remounts until the user dismisses it. */
export const SWAP_NOTICE_KEY = "solphia_jup_notice";
export const SWAP_NOTICE_EVENT = "solphia:jup-notice";
export const PHANTOM_SWAP_PENDING =
  "Opening Phantom to sign. Come back here — the swap lands after you approve.";

export type SwapNoticeKind = "error" | "ok" | "pending";
export type SwapNotice = { kind: SwapNoticeKind; text: string; at: number };

function store(): Storage | null {
  try {
    if (typeof sessionStorage === "undefined") return null;
    return sessionStorage;
  } catch {
    return null;
  }
}

function friendlySwapText(text: string): string {
  if (/0x1788|InsufficientFunds/i.test(text)) return "Not enough of that token in this wallet. Try a smaller amount.";
  if (/0x1771|SlippageToleranceExceeded/i.test(text)) return "Price moved. Try again.";
  if (/malicious|transaction simulation failed/i.test(text) && /0x1788|insufficient/i.test(text)) {
    return "Not enough of that token in this wallet. Try a smaller amount.";
  }
  return text;
}

export function formatSwapError(err: unknown): string {
  if (err == null) return "Swap failed.";
  if (typeof err === "string") {
    const t = err.trim();
    return friendlySwapText(t || "Swap failed.");
  }
  if (err instanceof Error) {
    const t = err.message.trim();
    return friendlySwapText(t || "Swap failed.");
  }
  if (typeof err === "object") {
    const rec = err as { message?: unknown; error?: unknown; err?: unknown; msg?: unknown };
    if (typeof rec.message === "string" && rec.message.trim()) return friendlySwapText(rec.message.trim());
    if (rec.error != null) return formatSwapError(rec.error);
    if (rec.err != null) return formatSwapError(rec.err);
    if (typeof rec.msg === "string" && rec.msg.trim()) return friendlySwapText(rec.msg.trim());
  }
  return "Swap failed.";
}

export function isPhantomSwapPending(text: string): boolean {
  return /approve in phantom|opening phantom|swap lands when you come back|PHANTOM_REDIRECT/i.test(text);
}

export function noticeFromSwapError(err: unknown): SwapNotice {
  const text = formatSwapError(err);
  if (isPhantomSwapPending(text)) {
    return { kind: "pending", text: PHANTOM_SWAP_PENDING, at: Date.now() };
  }
  return { kind: "error", text: text.slice(0, 500), at: Date.now() };
}

export function loadSwapNotice(): SwapNotice | null {
  const s = store();
  if (!s) return null;
  try {
    const raw = s.getItem(SWAP_NOTICE_KEY);
    if (!raw) return null;
    const j = JSON.parse(raw) as { kind?: unknown; text?: unknown; at?: unknown };
    if (j.kind !== "error" && j.kind !== "ok" && j.kind !== "pending") return null;
    if (typeof j.text !== "string" || !j.text.trim()) return null;
    return { kind: j.kind, text: j.text.trim().slice(0, 500), at: Number(j.at) || 0 };
  } catch {
    return null;
  }
}

export function saveSwapNotice(n: SwapNotice): SwapNotice {
  const next: SwapNotice = {
    kind: n.kind,
    text: n.text.trim().slice(0, 500),
    at: n.at || Date.now(),
  };
  try {
    store()?.setItem(SWAP_NOTICE_KEY, JSON.stringify(next));
  } catch {
    /* quota / ITP */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SWAP_NOTICE_EVENT, { detail: next }));
  }
  return next;
}

export function clearSwapNotice() {
  try {
    store()?.removeItem(SWAP_NOTICE_KEY);
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SWAP_NOTICE_EVENT, { detail: null }));
  }
}

export function markPhantomSwapPending(): SwapNotice {
  return saveSwapNotice({ kind: "pending", text: PHANTOM_SWAP_PENDING, at: Date.now() });
}
