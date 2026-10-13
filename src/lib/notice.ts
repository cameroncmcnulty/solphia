export const NOTICE_EVENT = "solphia:notice";

export type NoticeKind = "ok" | "err";

export function flashNotice(message: string, kind: NoticeKind = "ok") {
  if (typeof window === "undefined") return;
  const text = (message || "").trim();
  if (!text) return;
  window.dispatchEvent(new CustomEvent(NOTICE_EVENT, { detail: { message: text, kind } }));
}
