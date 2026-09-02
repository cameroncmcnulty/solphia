"use client";

import { useState } from "react";

export type ConfigShape = {
  maxSolPerTrade: number;
  minScore: number;
  takeProfitPct: number;
  stopLossPct: number;
  maxDevHoldPct: number;
  autoSell: boolean;
  copy: boolean;
  picks: boolean;
  launch: boolean;
  migrate: boolean;
  solUsd: boolean;
};

const TABS = [
  { id: "trading", label: "Trading" },
  { id: "safety", label: "Safety" },
  { id: "desks", label: "Desks" },
] as const;

export function ConfigDesk({
  value,
  onChange,
  layout = "split",
}: {
  value: ConfigShape;
  onChange: (partial: Partial<ConfigShape>) => void;
  layout?: "split" | "stack";
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("trading");
  const risk =
    value.maxSolPerTrade >= 1 || value.minScore < 65
      ? "Aggressive"
      : value.minScore >= 80 && value.maxSolPerTrade <= 0.2
        ? "Tight"
        : "Measured";
  const desks = [
    value.copy && "copy",
    value.picks && "picks",
    value.launch && "launch",
    value.migrate && "grad",
    value.solUsd && "SOL/USDT",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={layout === "split" ? "grid gap-4 lg:grid-cols-[1.2fr_0.8fr]" : "space-y-4"}>
      <div className="panel space-y-5 rounded-2xl p-5">
        <div>
          <div className="font-mono text-[10px] tracking-[0.22em] text-violet">BOT CONFIGURATION</div>
          <h3 className="mt-1 font-display text-2xl text-ghost md:text-3xl">Set the rails.</h3>
          <p className="mt-2 text-base text-mute">Size, safety, take-profit, stop. Drag — it saves. She still refuses first.</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`min-h-[44px] shrink-0 rounded-full px-4 py-2 font-mono text-[12px] ${
                tab === t.id ? "btn-on" : "btn-ghost"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "trading" && (
          <div className="space-y-5">
            <Slider
              label="Max SOL / trade"
              hint="Hard size cap. Policy still cuts this if it is too much of the book."
              min={0.05}
              max={2}
              step={0.05}
              value={value.maxSolPerTrade}
              format={(n) => `${n.toFixed(2)} SOL`}
              onChange={(n) => onChange({ maxSolPerTrade: n })}
            />
            <Slider
              label="First take-profit"
              hint="Ladder still fires at 1.5 / 2 / 3 / 5x. This is the first scale."
              min={0.2}
              max={1.5}
              step={0.05}
              value={value.takeProfitPct}
              format={(n) => `+${Math.round(n * 100)}%`}
              onChange={(n) => onChange({ takeProfitPct: n })}
            />
            <Slider
              label="Stop-loss"
              hint="Hard stop. Kill from local high (−25%) still runs."
              min={0.08}
              max={0.4}
              step={0.01}
              value={value.stopLossPct}
              format={(n) => `−${Math.round(n * 100)}%`}
              onChange={(n) => onChange({ stopLossPct: n })}
            />
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-mute">Auto-sell ladder</span>
              <span className="text-acid">LOCKED ON</span>
            </div>
          </div>
        )}

        {tab === "safety" && (
          <div className="space-y-5">
            <Slider
              label="Min safety"
              hint="Coins under this score never get a buy intent."
              min={60}
              max={90}
              step={1}
              value={value.minScore}
              format={(n) => String(Math.round(n))}
              onChange={(n) => onChange({ minScore: n })}
            />
            <Slider
              label="Max creator / top-10 bag"
              hint="If the leader or top wallets own more than this, she fades."
              min={8}
              max={40}
              step={1}
              value={value.maxDevHoldPct}
              format={(n) => `${Math.round(n)}%`}
              onChange={(n) => onChange({ maxDevHoldPct: n })}
            />
            <LockRow k="Kill switch / daily loss cap" />
            <LockRow k="Rug flatten from local high" />
            <LockRow k="Mint / freeze / bundle vetoes" />
          </div>
        )}

        {tab === "desks" && (
          <div className="space-y-3">
            <DeskToggle
              label="Copy"
              hint="Copy the decision, not the bag. Only when a follower could have seen it."
              on={value.copy}
              onChange={(v) => onChange({ copy: v })}
            />
            <DeskToggle
              label="Solphia Picks"
              hint="Extremely picky. Telegram, P(grad) ≥ 62%, learned bar. Empty is the point."
              on={value.picks}
              onChange={(v) => onChange({ picks: v })}
            />
            <DeskToggle
              label="Launch"
              hint="Only if P(grad) clears. Under five minutes is a no."
              on={value.launch}
              onChange={(v) => onChange({ launch: v })}
            />
            <DeskToggle
              label="Graduation"
              hint="Fills near migrate. Not a same-block snipe."
              on={value.migrate}
              onChange={(v) => onChange({ migrate: v })}
            />
            <DeskToggle
              label="SOL / USDT day-trade"
              hint="Spot scalp vs Tether. Stop ≥ 0.5%, first target 2R after fees, daily goal 0.5%. No leverage."
              on={value.solUsd}
              onChange={(v) => onChange({ solUsd: v })}
            />
          </div>
        )}
      </div>

      <div className="panel rounded-2xl p-5">
        <div className="font-mono text-[10px] tracking-[0.22em] text-mute">STRATEGY PREVIEW</div>
        <dl className="mt-4 space-y-3 font-mono text-[13px]">
          <Row k="Size" v={`up to ${value.maxSolPerTrade.toFixed(2)} SOL`} />
          <Row k="Risk" v={risk} />
          <Row k="Safety floor" v={String(Math.round(value.minScore))} />
          <Row k="First TP" v={`+${Math.round(value.takeProfitPct * 100)}%`} />
          <Row k="Stop" v={`−${Math.round(value.stopLossPct * 100)}%`} />
          <Row k="Creator bag" v={`max ${Math.round(value.maxDevHoldPct)}%`} />
          <Row k="Desks" v={desks || "none"} />
          <Row k="Kill switch" v="on" />
        </dl>
        <p className="mt-5 rounded-xl border border-acid/30 bg-acid/5 px-3 py-2 font-mono text-[12px] text-acid">
          Saved as you drag. Scout + Risk + policy still have to agree on every name.
        </p>
      </div>
    </div>
  );
}

function LockRow({ k }: { k: string }) {
  return (
    <div className="flex items-center justify-between font-mono text-xs">
      <span className="text-mute">{k}</span>
      <span className="text-acid">LOCKED ON</span>
    </div>
  );
}

function DeskToggle({
  label,
  hint,
  on,
  onChange,
}: {
  label: string;
  hint: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="flex w-full items-start justify-between gap-3 rounded-xl border border-violet/20 p-3 text-left"
    >
      <div>
        <div className="font-mono text-[13px] text-ghost">{label}</div>
        <div className="mt-1 font-mono text-[11px] leading-relaxed text-mute">{hint}</div>
      </div>
      <span className={`shrink-0 font-mono text-[12px] ${on ? "text-acid" : "text-mute"}`}>{on ? "ON" : "OFF"}</span>
    </button>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-violet/10 pb-2">
      <dt className="text-mute">{k}</dt>
      <dd className="text-ghost">{v}</dd>
    </div>
  );
}

function Slider({
  label,
  hint,
  min,
  max,
  step,
  value,
  format,
  onChange,
}: {
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  value: number;
  format: (n: number) => string;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[13px] text-ghost">{label}</span>
        <span className="font-mono text-[13px] text-acid">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-[#14f195]"
      />
      <p className="mt-1 font-mono text-[11px] leading-relaxed text-mute">{hint}</p>
    </label>
  );
}
