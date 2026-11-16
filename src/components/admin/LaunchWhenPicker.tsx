"use client";

import {
  SPHA_MINT_LEAD_MS,
  applyLaunchPreset,
  countdownLeadOk,
  formatSphaLaunchWhen,
  fromLocalDateTime,
  localTimeZoneShort,
  toLocalDateValue,
  toLocalTimeValue,
  type LaunchPresetId,
} from "@/lib/token/countdown";

const PRESETS: { id: LaunchPresetId; label: string }[] = [
  { id: "1h", label: "+1h" },
  { id: "2h", label: "+2h" },
  { id: "6h", label: "+6h" },
  { id: "tonight", label: "Tonight 8pm" },
  { id: "tomorrow", label: "Tomorrow noon" },
  { id: "1d", label: "+1 day" },
  { id: "3d", label: "+3 days" },
];

const inputCls =
  "mt-1 block w-full min-h-[44px] rounded-2xl border border-violet/30 bg-void px-3 py-2 text-base text-ghost outline-none [color-scheme:dark]";

function localZoneName(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Denver";
  } catch {
    return "America/Denver";
  }
}

export function LaunchWhenPicker({
  date,
  time,
  onChange,
}: {
  date: string;
  time: string;
  onChange: (date: string, time: string) => void;
}) {
  const launchAt = fromLocalDateTime(date, time);
  const mintAt = launchAt > 0 ? launchAt - SPHA_MINT_LEAD_MS : 0;
  const ok = countdownLeadOk(launchAt);
  const tz = localTimeZoneShort() || "local";
  const zone = localZoneName();

  function setMs(ms: number) {
    onChange(toLocalDateValue(ms), toLocalTimeValue(ms));
  }

  return (
    <div className="w-full max-w-xl">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="font-mono text-[10px] tracking-[0.16em] text-mute">DATE</span>
          <input
            type="date"
            value={date}
            min={toLocalDateValue(Date.now())}
            onChange={(e) => onChange(e.target.value, time)}
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="font-mono text-[10px] tracking-[0.16em] text-mute">TIME · {tz}</span>
          <input
            type="time"
            value={time}
            step={60}
            onChange={(e) => onChange(date, e.target.value)}
            className={inputCls}
          />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setMs(applyLaunchPreset(p.id))}
            className="btn-ghost rounded-full px-3 py-1.5 text-[11px]"
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="mt-3 rounded-2xl border border-line bg-void/40 px-4 py-3 font-mono text-[12px]">
        {launchAt > 0 ? (
          <>
            <div className="text-ghost">T-0 {formatSphaLaunchWhen(launchAt, zone)}</div>
            <div className="mt-1 text-mute">T-30 mint {formatSphaLaunchWhen(mintAt, zone)}</div>
            <div className={`mt-2 ${ok ? "text-acid" : "text-amber-300"}`}>
              {ok ? "Window looks good." : "Need at least 30 minutes 30 seconds so T-30 has a mint window."}
            </div>
          </>
        ) : (
          <div className="text-mute">Pick a date and a time. Quick chips below fill both.</div>
        )}
      </div>
    </div>
  );
}
