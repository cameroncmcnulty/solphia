"use client";

import { useState, type ReactNode } from "react";
import { firstError, firstErrorKey } from "@/lib/launch/validate";

export function fieldClass(error?: string, ok = "border-violet/30") {
  return error ? "border-blood ring-1 ring-blood/60" : ok;
}

export function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p role="alert" className="mt-1.5 font-mono text-[11px] leading-snug text-blood">
      {error}
    </p>
  );
}

export function FormAlert({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-2xl border border-blood/50 bg-blood/10 px-4 py-3 font-mono text-sm text-blood">
      {error}
    </p>
  );
}

export function focusField(id: string) {
  if (typeof document === "undefined") return;
  const el = document.querySelector(`[data-field="${id}"]`);
  if (!(el instanceof HTMLElement)) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  const target = el.matches("input, textarea, select, button") ? el : el.querySelector("input, textarea, select, button");
  if (target instanceof HTMLElement) {
    try {
      target.focus();
    } catch {
      /* ignore */
    }
  }
}

export function useConfirmErrors<K extends string>() {
  const [errors, setErrors] = useState<Partial<Record<K, string>>>({});
  const [banner, setBanner] = useState("");

  function fail(next: Partial<Record<K, string>>, formMsg?: string) {
    setErrors(next);
    const msg = formMsg || firstError(next);
    setBanner(msg);
    const key = firstErrorKey(next);
    if (key) requestAnimationFrame(() => focusField(key));
    return msg;
  }

  function clear(key?: K) {
    if (!key) {
      setErrors({});
      setBanner("");
      return;
    }
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const n = { ...prev };
      delete n[key];
      return n;
    });
  }

  function ok() {
    setErrors({});
    setBanner("");
  }

  return { errors, banner, fail, clear, ok, setBanner };
}

export function ErrorRing({ error, children, field }: { error?: string; children: ReactNode; field?: string }) {
  return (
    <div data-field={field} className={error ? "rounded-2xl ring-1 ring-blood/60" : undefined}>
      {children}
    </div>
  );
}
