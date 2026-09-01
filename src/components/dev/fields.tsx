"use client";

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 font-mono text-[10px] tracking-[0.18em] text-mute">{label}</div>
      {children}
    </label>
  );
}

export const inputClass =
  "min-h-[44px] w-full rounded-2xl border border-line bg-void px-4 py-2 font-mono text-sm text-ghost outline-none";

export function Toggle({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`flex min-h-[48px] w-full items-center justify-between rounded-2xl border px-4 font-mono text-xs ${
        on ? "border-acid/50 text-acid" : "border-line text-mute"
      }`}
    >
      {label}
      <span>{on ? "ON" : "OFF"}</span>
    </button>
  );
}

export function Status({ msg, ok }: { msg: string; ok?: boolean }) {
  if (!msg) return null;
  return <p className={`mt-3 break-all font-mono text-xs ${ok ? "text-acid" : "text-blood"}`}>{msg}</p>;
}
