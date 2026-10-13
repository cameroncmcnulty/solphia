"use client";

import { useEffect, useState } from "react";
import { NOTICE_EVENT, type NoticeKind } from "@/lib/notice";

type Toast = { id: number; text: string; kind: NoticeKind };

export function NoticeHost() {
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ message?: string; kind?: NoticeKind }>).detail;
      const text = (d?.message || "").trim();
      if (!text) return;
      setToast({ id: Date.now(), text, kind: d?.kind === "err" ? "err" : "ok" });
    };
    window.addEventListener(NOTICE_EVENT, on);
    return () => window.removeEventListener(NOTICE_EVENT, on);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(12px,env(safe-area-inset-top))] z-[200] flex justify-center px-3">
      <div
        role="status"
        className={`max-w-[min(92vw,28rem)] rounded-full px-5 py-2 text-center font-display text-base shadow-[0_12px_40px_rgba(0,0,0,0.45)] ${
          toast.kind === "err" ? "bg-blood text-white" : "bg-acid text-void"
        }`}
      >
        {toast.text}
      </div>
    </div>
  );
}
