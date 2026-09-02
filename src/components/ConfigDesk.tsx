"use client";

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
};

export function ConfigDesk({
  value,
  onChange,
}: {
  value: ConfigShape;
  onChange: (partial: Partial<ConfigShape>) => void;
}) {
  const risk =
    value.maxSolPerTrade >= 1 || value.minScore < 65 ? "Aggressive" : value.minScore >= 80 && value.maxSolPerTrade <= 0.2 ? "Tight" : "Measured";
  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="panel space-y-5 rounded-2xl p-5">
        <div>
          <div className="font-mono text-[10px] tracking-[0.22em] text-violet">CONFIGURATION</div>
          <h3 className="mt-1 font-display text-2xl text-ghost">Set the rails. She still refuses first.</h3>
          <p className="mt-2 text-sm text-mute">
            Size, safety, first take-profit, and stop. The daily loss cap and rug flatten cannot be switched off.
          </p>
        </div>
        <Slider
          label="Max SOL / trade"
          hint="Hard size cap. Policy will still cut this if it is too much of the book."
          min={0.05}
          max={2}
          step={0.05}
          value={value.maxSolPerTrade}
          format={(n) => `${n.toFixed(2)} SOL`}
          onChange={(n) => onChange({ maxSolPerTrade: n })}
        />
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
        <div className="flex items-center justify-between font-mono text-xs">
          <span className="text-mute">Auto-sell ladder + kill switch</span>
          <span className="text-acid">LOCKED ON</span>
        </div>
      </div>
      <div className="panel rounded-2xl p-5">
        <div className="font-mono text-[10px] tracking-[0.22em] text-mute">STRATEGY PREVIEW</div>
        <dl className="mt-4 space-y-3 font-mono text-[12px]">
          <Row k="Size" v={`up to ${value.maxSolPerTrade.toFixed(2)} SOL`} />
          <Row k="Risk" v={risk} />
          <Row k="Safety floor" v={String(Math.round(value.minScore))} />
          <Row k="First TP" v={`+${Math.round(value.takeProfitPct * 100)}%`} />
          <Row k="Stop" v={`−${Math.round(value.stopLossPct * 100)}%`} />
          <Row k="Creator bag" v={`max ${Math.round(value.maxDevHoldPct)}%`} />
          <Row
            k="Desks"
            v={[value.copy && "copy", value.picks && "picks", value.launch && "launch", value.migrate && "grad"].filter(Boolean).join(" · ") || "none"}
          />
          <Row k="Kill switch" v="on" />
        </dl>
        <p className="mt-5 rounded-xl border border-acid/30 bg-acid/5 px-3 py-2 font-mono text-[11px] text-acid">
          Configuration valid. Scout + Risk + policy still have to agree on every name.
        </p>
      </div>
    </div>
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
        <span className="font-mono text-[11px] text-ghost">{label}</span>
        <span className="font-mono text-[11px] text-acid">{format(value)}</span>
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
      <p className="mt-1 font-mono text-[10px] leading-relaxed text-mute">{hint}</p>
    </label>
  );
}
