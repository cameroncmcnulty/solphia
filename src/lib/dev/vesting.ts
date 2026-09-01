export type Tranche = { at: number; pct: number; label: string };

export function linearSchedule(opts: {
  startAt: number;
  months: number;
  cliffMonths?: number;
}): Tranche[] {
  const months = Math.max(1, Math.min(48, Math.floor(opts.months)));
  const cliff = Math.max(0, Math.min(months, Math.floor(opts.cliffMonths || 0)));
  const out: Tranche[] = [];
  const remainingMonths = months - cliff;
  if (cliff > 0) {
    const cliffPct = cliff / months;
    out.push({
      at: opts.startAt + cliff * 30 * 24 * 60 * 60 * 1000,
      pct: cliffPct,
      label: `Cliff · month ${cliff}`,
    });
  }
  if (remainingMonths <= 0) return out;
  const each = (1 - out.reduce((s, t) => s + t.pct, 0)) / remainingMonths;
  for (let i = 1; i <= remainingMonths; i++) {
    const month = cliff + i;
    out.push({
      at: opts.startAt + month * 30 * 24 * 60 * 60 * 1000,
      pct: i === remainingMonths ? 1 - out.reduce((s, t) => s + t.pct, 0) : each,
      label: `Unlock · month ${month}`,
    });
  }
  return out;
}

export function splitAmount(totalRaw: bigint, tranches: Tranche[]): { at: number; label: string; amount: bigint }[] {
  let used = 0n;
  return tranches.map((t, i) => {
    const amount = i === tranches.length - 1 ? totalRaw - used : BigInt(Math.floor(Number(totalRaw) * t.pct));
    used += amount;
    return { at: t.at, label: t.label, amount };
  });
}
