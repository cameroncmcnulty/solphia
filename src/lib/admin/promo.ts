import fs from "fs";
import { packNote, writePack } from "../content/copy";
import { renderShot } from "../content/render";
import { audit, loadState, mutateState, pushBounded } from "../store";
import type { AppState, PromoItem } from "../types";
import { promoPath } from "./promoFile";

export const PROMO_CAP = 24;
export { promoPath, promoDataUrl, promoViewOk, promoViewToken } from "./promoFile";

function id() {
  return `prm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function utcDay(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 10);
}

function writeBytes(buf: Buffer, ext: string): { id: string; file: string } {
  const pid = id();
  const file = `${pid}.${ext}`;
  fs.writeFileSync(promoPath(file), buf);
  return { id: pid, file };
}

export function prunePromos(state: AppState) {
  if (!state.promos) state.promos = [];
  while (state.promos.length > PROMO_CAP) {
    const old = state.promos.shift();
    if (old?.file) {
      try {
        fs.unlinkSync(promoPath(old.file));
      } catch {
        /* gone */
      }
    }
  }
}

function pushPromo(state: AppState, item: PromoItem) {
  if (!state.promos) state.promos = [];
  state.promos.push(item);
  prunePromos(state);
  pushBounded(state.audit, audit("admin", "promo", `${item.kind} ${item.aspect}`), 400);
}

/** Old Imagine jobs — drop them. The content bot paints in-house now. */
export async function settlePendingPromo(_waitMs = 0): Promise<boolean> {
  const pending = loadState().promoPending;
  if (!pending) return false;
  await mutateState((s) => {
    s.promoPending = null;
  });
  return false;
}

export async function generatePromoPack(opts?: { force?: boolean; hint?: string }): Promise<{ made: number; error?: string; note?: string }> {
  await settlePendingPromo().catch(() => false);
  const state = loadState();
  const day = utcDay();
  if (!opts?.force && state.lastPromoDay === day && (state.promos || []).some((p) => utcDay(p.at) === day)) {
    return { made: 0, note: "Already posted today. Force a pack from the desk if you want more." };
  }
  const shots = await writePack({ hint: opts?.hint, now: Date.now() });
  const items: PromoItem[] = [];
  const errors: string[] = [];
  for (const shot of shots) {
    try {
      const png = await renderShot(shot);
      const stored = writeBytes(png, "png");
      items.push({
        id: stored.id,
        at: Date.now(),
        kind: "image",
        aspect: shot.aspect,
        headline: shot.headline,
        caption: shot.caption,
        pnlLabel: shot.pnlLabel,
        prompt: shot.kicker,
        mime: "image/png",
        file: stored.file,
      });
    } catch (e) {
      errors.push(e instanceof Error ? e.message : "render failed");
    }
  }
  if (!items.length) {
    return { made: 0, error: errors[0] || "Content bot could not paint." };
  }
  await mutateState((s) => {
    for (const item of items) pushPromo(s, item);
    s.lastPromoDay = day;
    s.promoPending = null;
  });
  return { made: items.length, note: packNote(shots), error: errors[0] };
}

export async function maybeGeneratePromos() {
  await settlePendingPromo().catch(() => false);
  const s = loadState();
  if (s.lastPromoDay === utcDay()) return { made: 0 };
  return generatePromoPack();
}
