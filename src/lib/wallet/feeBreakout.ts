import { splitFee, SWAP_FEE_BPS } from "../launch/curve";

/** Display-only 1% breakout. Does not change on-chain fee math. */
export function feeBreakout(feeSol: number, bonded: boolean) {
  const s = splitFee(Math.max(0, feeSol), bonded);
  return {
    totalSol: s.dev + s.owner + s.treasury + s.referral,
    creatorSol: s.dev,
    houseSol: s.owner + s.treasury + s.referral,
    inviteSol: s.referral,
    totalBps: SWAP_FEE_BPS,
    creatorBps: 50,
    houseBps: 50,
    inviteBps: bonded ? 12.5 : 0,
  };
}

export function minReceived(outAmount: number, slippageBps: number) {
  const slip = Math.max(0, slippageBps) / 10_000;
  return Math.max(0, outAmount * (1 - slip));
}
