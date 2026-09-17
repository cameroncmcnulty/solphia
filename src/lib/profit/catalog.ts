import { SWAP_FEE_BPS } from "../launch/curve";
import { ROCKET_PACKS } from "../launch/boost";
import { SHILL_PIN_SOL } from "../shill/types";
import { seatSol } from "../seat";
import { treasuryAddress } from "../treasury";
import type { AppState } from "../types";
import { ensureShill } from "../shill/engine";
import { emptyLaunchBook } from "../launch/engine";

/** Live in-house skim. Same 1% as pad Jupiter swaps. Not the 10 bps paper pair model. */
export const LIVE_SKIM_BPS = SWAP_FEE_BPS;
export const PAD_CURVE_BPS = SWAP_FEE_BPS;

export type ProfitWallet = "treasury" | "owner" | "creator" | "referrer";

export type ProfitStream = {
  id: string;
  feature: string;
  rate: string;
  wallet: ProfitWallet;
  walletPk: string;
  accruedSol: number;
  settlement: string;
};

export type ProfitDesk = {
  treasury: string;
  ownerWallet: string;
  liveSkimBps: number;
  padCurveBps: number;
  seatLiveSol: number;
  seatLevSol: number;
  pinSol: number;
  boosts: { rockets: number; sol: number; label: string }[];
  padSplit: { creator: string; owner: string; treasury: string };
  padSplitReferred: { creator: string; referral: string; owner: string; treasury: string };
  streams: ProfitStream[];
  accrued: {
    treasurySol: number;
    ownerSol: number;
    creatorSol: number;
    referralSol: number;
  };
};

export function buildProfitDesk(state: AppState): ProfitDesk {
  const treasury = treasuryAddress();
  const ownerWallet = state.ownerWallet || state.launch?.ownerWallet || "";
  const launch = state.launch || emptyLaunchBook();
  const shill = ensureShill(state.shill);
  const padTreasury = Number(launch.treasuryFeesSol) || 0;
  const padOwner = Number(launch.ownerEarningsSol) || 0;
  const padCreator = (launch.coins || []).reduce((s, c) => s + (c.devRewardsSol || 0), 0);
  const padReferral = Object.values(launch.accounts || {}).reduce((s, a) => s + (a.referralRewardsSol || 0), 0);
  const pinSol = (shill.pins || []).reduce((s, p) => s + (p.house ? 0 : Number(p.paidSol) || 0), 0);
  const boostSol = (launch.boosts || []).reduce((s, b) => s + (b.house ? 0 : Number(b.paidSol) || 0), 0);
  const seatSolAccrued = (state.users || []).reduce((s, u) => {
    if (!(u.lastPaidAt && (u.plan === "live" || u.plan === "lev" || u.plan === "full"))) return s;
    return s + seatSol(u.plan);
  }, 0);
  const streams: ProfitStream[] = [
    {
      id: "desk",
      feature: "Automate live clips",
      rate: "1% of clip SOL",
      wallet: "treasury",
      walletPk: treasury,
      accruedSol: 0,
      settlement: "On-chain SOL transfer in the same swap tx",
    },
    {
      id: "swap",
      feature: "In-house / pad Jupiter swaps",
      rate: "1% of SOL",
      wallet: "treasury",
      walletPk: treasury,
      accruedSol: 0,
      settlement: "On-chain SOL transfer in the same swap tx",
    },
    {
      id: "pad-treasury",
      feature: "Pad curve buys and sells",
      rate: "1% of trade · 25% of that fee",
      wallet: "treasury",
      walletPk: treasury,
      accruedSol: padTreasury,
      settlement: "Booked on the pad; withdraw with protocol tools",
    },
    {
      id: "pad-owner",
      feature: "Pad curve buys and sells",
      rate: "1% of trade · 25% of that fee (12.5% if referred)",
      wallet: "owner",
      walletPk: ownerWallet,
      accruedSol: padOwner,
      settlement: "Owner withdraw on the pad",
    },
    {
      id: "pad-creator",
      feature: "Pad curve buys and sells",
      rate: "1% of trade · 50% of that fee",
      wallet: "creator",
      walletPk: "coin creator",
      accruedSol: padCreator,
      settlement: "Creator Dev Rewards withdraw",
    },
    {
      id: "pad-ref",
      feature: "Pad curve (referred creator)",
      rate: "25% of the 1% fee, taken from owner + treasury",
      wallet: "referrer",
      walletPk: "inviter",
      accruedSol: padReferral,
      settlement: "Inviter withdraw on account",
    },
    {
      id: "seat",
      feature: "Live / lev seats",
      rate: `${seatSol("live")} SOL / 30d live · ${seatSol("lev")} SOL / 30d lev`,
      wallet: "treasury",
      walletPk: treasury,
      accruedSol: seatSolAccrued,
      settlement: "Phantom first month, trading wallet renewals",
    },
    {
      id: "pin",
      feature: "Shill Zone pins",
      rate: `${SHILL_PIN_SOL} SOL / 3h`,
      wallet: "treasury",
      walletPk: treasury,
      accruedSol: pinSol,
      settlement: "Phantom pay to treasury",
    },
    {
      id: "boost",
      feature: "Pad boosts (rockets)",
      rate: ROCKET_PACKS.map((p) => `${p.rockets} = ${p.sol} SOL`).join(" · "),
      wallet: "treasury",
      walletPk: treasury,
      accruedSol: boostSol,
      settlement: "Phantom pay to treasury",
    },
  ];
  const treasurySol = padTreasury + pinSol + boostSol + seatSolAccrued;
  return {
    treasury,
    ownerWallet,
    liveSkimBps: LIVE_SKIM_BPS,
    padCurveBps: PAD_CURVE_BPS,
    seatLiveSol: seatSol("live"),
    seatLevSol: seatSol("lev"),
    pinSol: SHILL_PIN_SOL,
    boosts: ROCKET_PACKS.map((p) => ({ rockets: p.rockets, sol: p.sol, label: p.label })),
    padSplit: { creator: "50%", owner: "25%", treasury: "25%" },
    padSplitReferred: { creator: "50%", referral: "25%", owner: "12.5%", treasury: "12.5%" },
    streams,
    accrued: {
      treasurySol,
      ownerSol: padOwner,
      creatorSol: padCreator,
      referralSol: padReferral,
    },
  };
}

export function profitWalletLabel(w: ProfitWallet): string {
  if (w === "treasury") return "Treasury";
  if (w === "owner") return "Owner";
  if (w === "creator") return "Creator";
  return "Inviter";
}
