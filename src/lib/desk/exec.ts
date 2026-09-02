import type { LabKind, LabStrategy, Strategy } from "../types";
import { kindOf, sizeBudget } from "./shadow";

/**
 * Exec sizes and routes. It never sees a key.
 * Live size is zero until the lab promotes the desk.
 * Paper probe size is 25% until promotion so the lab can still learn.
 */
export function execSize(opts: {
  strategy: Strategy;
  baseUsd: number;
  lab?: Record<LabKind, LabStrategy>;
  live?: boolean;
}): { ok: boolean; sizeUsd: number; reason: string } {
  const kind = kindOf(opts.strategy);
  if (!kind) return { ok: false, sizeUsd: 0, reason: "Exec does not run scalp as a desk." };
  const lab = opts.lab?.[kind];
  if (!lab) {
    if (opts.live) return { ok: false, sizeUsd: 0, reason: "No lab budget." };
    if (kind !== "copy") return { ok: false, sizeUsd: 0, reason: "No lab budget." };
    return opts.baseUsd >= 8
      ? { ok: true, sizeUsd: opts.baseUsd, reason: "Copy probe." }
      : { ok: false, sizeUsd: 0, reason: "Size too small after fees." };
  }
  const sizeUsd = sizeBudget(lab, opts.baseUsd, Boolean(opts.live));
  if (sizeUsd < 8) return { ok: false, sizeUsd: 0, reason: "No size budget. Desk is demoted or still in lab." };
  return { ok: true, sizeUsd, reason: lab.enabled ? "Full budget." : "Lab probe size." };
}
