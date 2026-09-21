"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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

/** contenteditable so WebKit/Chrome cannot run HTML pattern checks on launch fields */
export function SafeField({
  value,
  onChange,
  placeholder,
  className,
  max,
  filter,
  field,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  max?: number;
  filter?: (s: string) => string;
  field?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if ((el.textContent || "") !== value) el.textContent = value;
  }, [value]);
  return (
    <div
      ref={ref}
      role="textbox"
      aria-multiline="false"
      contentEditable
      suppressContentEditableWarning
      data-field={field}
      data-placeholder={placeholder || ""}
      className={`safe-field ${className || ""}`}
      onInput={() => {
        let v = ref.current?.textContent || "";
        v = v.replace(/\n/g, "");
        if (filter) v = filter(v);
        if (max) v = v.slice(0, max);
        onChange(v);
        if (ref.current && ref.current.textContent !== v && document.activeElement === ref.current) {
          ref.current.textContent = v;
          const sel = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(ref.current);
          range.collapse(false);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.preventDefault();
      }}
    />
  );
}

export function ErrorRing({ error, children, field }: { error?: string; children: ReactNode; field?: string }) {
  return (
    <div data-field={field} className={error ? "rounded-2xl ring-1 ring-blood/60" : undefined}>
      {children}
    </div>
  );
}
