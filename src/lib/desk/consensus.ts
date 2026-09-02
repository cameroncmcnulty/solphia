import type { AutoSettings, EngineSettings, Mind, PaperBook, RiskReport, Strategy, TokenSnapshot } from "../types";
import { graduationRead, armLaunch, armMigrate } from "./grad";
import { toxicFlow } from "./toxic";
import { copyDecision } from "./copyDecision";
import { copyBlockReason } from "../risk/copy";
import { policyCheck, type Intent } from "./intent";
import { slippageBps } from "../risk/engine";
import type { LabKind, LabStrategy } from "./shadow";
import { execSize } from "./exec";
import { scorePick } from "../mind/engine";
import { hardPickGates } from "../mind/features";

type DeskFlags = Pick<AutoSettings, "copy" | "launch" | "migrate" | "scalp"> & { picks?: boolean };

export type ScoutHit = {
  token: TokenSnapshot;
  report: RiskReport;
  strategy: Strategy;
  pGrad: number;
  reason: string;
};

function deskOn(desks: DeskFlags | undefined, strategy: Strategy): boolean {
  if (!desks) return true;
  if (strategy === "copy_trade") return desks.copy !== false;
  if (strategy === "launch_snipe") return Boolean(desks.launch);
  if (strategy === "migration_snipe") return Boolean(desks.migrate);
  if (strategy === "scalp") return Boolean(desks.scalp);
  if (strategy === "solphia_pick") return Boolean(desks.picks);
  return false;
}

export function scout(opts: {
  token: TokenSnapshot;
  report: RiskReport;
  desks?: DeskFlags;
  now: number;
  settings: EngineSettings;
  mind?: Mind;
}): ScoutHit | null {
  const { token, report, desks, now, settings, mind } = opts;
  if (token.banned || token.nsfw) return null;
  const grad = graduationRead(token, now);
  const copy = copyDecision(token, now);

  if (deskOn(desks, "solphia_pick") && mind) {
    const pick = scorePick(mind, token, report.score, now);
    if (pick.ok && report.allowedStrategies.includes("solphia_pick")) {
      return { token, report, strategy: "solphia_pick", pGrad: grad.p, reason: pick.reason };
    }
  }

  if (deskOn(desks, "copy_trade") && token.smartMoneyInflow && copy.ok && report.allowedStrategies.includes("copy_trade")) {
    return { token, report, strategy: "copy_trade", pGrad: grad.p, reason: copy.reason };
  }
  if (deskOn(desks, "migration_snipe") && armMigrate(grad, token.bondingProgress, settings.minPGradMigrate ?? 0.55)) {
    if (report.allowedStrategies.includes("migration_snipe")) {
      return { token, report, strategy: "migration_snipe", pGrad: grad.p, reason: grad.why };
    }
  }
  if (deskOn(desks, "launch_snipe") && armLaunch(grad, settings.minPGradLaunch ?? 0.42)) {
    if (report.allowedStrategies.includes("launch_snipe")) {
      return { token, report, strategy: "launch_snipe", pGrad: grad.p, reason: grad.why };
    }
  }
  return null;
}

export function riskVeto(opts: {
  hit: ScoutHit;
  now: number;
  settings: EngineSettings;
}): { ok: boolean; reason: string } {
  const { hit, now, settings } = opts;
  const { token, report } = hit;
  if (report.vetoed) return { ok: false, reason: report.vetoReasons[0] || report.why };
  if (token.fundingDump) return { ok: false, reason: "Funding graph says dump. Flatten, don't ape." };
  const toxic = toxicFlow(token);
  if (toxic.toxic) return { ok: false, reason: toxic.reason };
  if (token.mintAuthorityRevoked === false) return { ok: false, reason: "Mint authority is live." };
  if (token.freezeAuthorityRevoked === false) return { ok: false, reason: "Freeze authority is live." };
  const copyBlk = copyBlockReason(token, settings);
  if (hit.strategy === "copy_trade") {
    if (copyBlk) return { ok: false, reason: copyBlk };
    const dec = copyDecision(token, now);
    if (!dec.ok) return { ok: false, reason: dec.reason };
  }
  if (hit.strategy === "launch_snipe" && hit.pGrad < (settings.minPGradLaunch ?? 0.48)) {
    return { ok: false, reason: `P(grad) ${(hit.pGrad * 100).toFixed(0)}% under the bar.` };
  }
  if (hit.strategy === "migration_snipe" && hit.pGrad < (settings.minPGradMigrate ?? 0.55) && token.bondingProgress < 0.88) {
    return { ok: false, reason: `P(grad) ${(hit.pGrad * 100).toFixed(0)}% — not a graduation.` };
  }
  if (hit.strategy === "solphia_pick") {
    const gates = hardPickGates(token, report.score, now);
    if (!gates.ok) return { ok: false, reason: gates.reason };
    if (report.score < (settings.minScorePick ?? 82)) return { ok: false, reason: "Pick safety bar." };
  }
  return { ok: true, reason: "Risk agrees." };
}

export function toIntent(hit: ScoutHit, sizeUsd: number, settings: EngineSettings, now: number): Intent {
  return {
    kind: "buy",
    mint: hit.token.mint,
    symbol: hit.token.symbol,
    strategy: hit.strategy,
    sizeUsd,
    maxSlipBps: slippageBps(hit.strategy, settings),
    expiresAt: now + (settings.intentTtlMs ?? 4000),
    reason: hit.reason,
    scout: "scout",
    risk: "allow",
  };
}

export function labKind(strategy: Strategy): LabKind | null {
  if (strategy === "copy_trade") return "copy";
  if (strategy === "launch_snipe") return "launch";
  if (strategy === "migration_snipe") return "migrate";
  if (strategy === "solphia_pick") return "pick";
  return null;
}

export function labAllows(lab: Record<LabKind, LabStrategy> | undefined, strategy: Strategy, live = false): boolean {
  const k = labKind(strategy);
  if (!k) return false;
  if (!lab) return k === "copy" && !live;
  if (lab[k].demoted) return false;
  if (live) return lab[k].enabled;
  return true;
}

export type DeskDecision =
  | { ok: true; hit: ScoutHit; intent: Intent }
  | { ok: false; reason: string; kind: LabKind | null; fade?: boolean };

export function decide(opts: {
  token: TokenSnapshot;
  report: RiskReport;
  desks?: DeskFlags;
  now: number;
  settings: EngineSettings;
  book: PaperBook;
  sizeUsd: number;
  lab?: Record<LabKind, LabStrategy>;
  live?: boolean;
  mind?: Mind;
}): DeskDecision {
  const hit = scout(opts);
  if (!hit) {
    const copy = copyDecision(opts.token, opts.now);
    if (opts.token.smartMoneyInflow && deskOn(opts.desks, "copy_trade") && !copy.ok) {
      return { ok: false, reason: copy.reason, kind: "copy", fade: copy.fade };
    }
    return { ok: false, reason: "Scout passed.", kind: null };
  }
  const kind = labKind(hit.strategy);
  if (!labAllows(opts.lab, hit.strategy, opts.live)) {
    return { ok: false, reason: "Lab has this desk demoted.", kind };
  }
  const risk = riskVeto({ hit, now: opts.now, settings: opts.settings });
  if (!risk.ok) return { ok: false, reason: risk.reason, kind, fade: false };
  const sized = execSize({
    strategy: hit.strategy,
    baseUsd: opts.sizeUsd,
    lab: opts.lab,
    live: opts.live,
  });
  if (!sized.ok) return { ok: false, reason: sized.reason, kind };
  const intent = toIntent(hit, sized.sizeUsd, opts.settings, opts.now);
  const policy = policyCheck(intent, {
    book: opts.book,
    settings: opts.settings,
    token: opts.token,
    now: opts.now,
    live: opts.live,
  });
  if (!policy.ok) return { ok: false, reason: policy.reason, kind };
  return { ok: true, hit, intent };
}
