import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";
import { splitFee, type FeeSplit } from "../launch/curve";
import { treasuryAddress } from "../treasury";
import { ownerAddress } from "../ownerWallet";
import { isSolanaAddress } from "../security";
import { loadState } from "../store";

/** Dust below this is folded into treasury so Phantom does not see empty transfers. */
export const FEE_DUST_LAMPORTS = 5_000;

export type HouseLeg = { to: string; lamports: number };

export type HouseFeeMode = "split" | "hold" | "even";

export type HouseFeeOpts = {
  from: string;
  feeSol: number;
  /** Token creator. Omit when there is no Solphia creator — that 50% stays protocol. */
  creator?: string;
  /** Inviter of the person generating this fee. */
  referrer?: string;
  owner?: string;
  treasury?: string;
  /**
   * split: live transfers to each wallet.
   * hold: creator + inviter still live; owner + treasury cut lands in treasury until admin claim.
   * even: boosts / pins — 100% to treasury, 50/50 split claimed later.
   */
  mode?: HouseFeeMode;
};

/** First locked inviter on this wallet, if any. */
export function boundReferrer(pubkey: string): string | undefined {
  if (!isSolanaAddress(pubkey)) return undefined;
  try {
    const r = (loadState().launch?.accounts?.[pubkey]?.referrer || "").trim();
    if (r && isSolanaAddress(r) && r !== pubkey) return r;
  } catch {
    /* store not ready */
  }
  return undefined;
}

export function houseShare(feeSol: number, referred: boolean, hasCreator: boolean): FeeSplit {
  const s = splitFee(feeSol, referred);
  if (hasCreator) return s;
  return { dev: 0, owner: s.owner, treasury: s.treasury + s.dev, referral: s.referral };
}

export function houseFeeLegs(opts: HouseFeeOpts): HouseLeg[] {
  const feeSol = Number(opts.feeSol) || 0;
  if (!(feeSol > 0) || !isSolanaAddress(opts.from)) return [];
  const referrer =
    opts.referrer && isSolanaAddress(opts.referrer) && opts.referrer !== opts.from ? opts.referrer : "";
  const creator =
    opts.creator && isSolanaAddress(opts.creator) && opts.creator !== opts.from ? opts.creator : "";
  const s = houseShare(feeSol, Boolean(referrer), Boolean(creator));
  const owner = (opts.owner && isSolanaAddress(opts.owner) ? opts.owner : ownerAddress()).trim();
  const treasury = (opts.treasury && isSolanaAddress(opts.treasury) ? opts.treasury : treasuryAddress()).trim();
  const rows: HouseLeg[] = [];
  const add = (to: string, sol: number) => {
    const lamports = Math.round(sol * LAMPORTS_PER_SOL);
    if (!to || !isSolanaAddress(to) || lamports < FEE_DUST_LAMPORTS || to === opts.from) return;
    const hit = rows.find((r) => r.to === to);
    if (hit) hit.lamports += lamports;
    else rows.push({ to, lamports });
  };
  const mode = opts.mode || "split";
  if (mode === "even") {
    add(treasury, feeSol);
    return rows.filter((r) => r.lamports >= FEE_DUST_LAMPORTS);
  }
  add(creator, s.dev);
  add(referrer, s.referral);
  if (mode === "hold") add(treasury, s.owner + s.treasury);
  else {
    add(owner, s.owner);
    add(treasury, s.treasury);
  }
  return rows.filter((r) => r.lamports >= FEE_DUST_LAMPORTS);
}

export function houseFeeIxs(opts: HouseFeeOpts): TransactionInstruction[] {
  return houseFeeLegs(opts).map((leg) =>
    SystemProgram.transfer({
      fromPubkey: new PublicKey(opts.from),
      toPubkey: new PublicKey(leg.to),
      lamports: leg.lamports,
    }),
  );
}
