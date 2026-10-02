import { dbcEnabled, liveDbcConfig } from "../launch/dbcIds";
import { chainPartnerTotals } from "../launch/dbc";
import { jupReferralBalances } from "../jup/referral";
import type { AppState } from "../types";
import type { ProfitDesk } from "./catalog";

/** Pull live DBC partner fees and Jupiter referral ATAs onto the profit desk. */
export async function enrichProfitDesk(desk: ProfitDesk, state: AppState): Promise<ProfitDesk> {
  let dbcPartnerSol = 0;
  try {
    if (dbcEnabled()) {
      const cfg = liveDbcConfig(state.launch?.dbcConfig);
      if (cfg) {
        const tot = await chainPartnerTotals(cfg);
        dbcPartnerSol = Number(tot.unclaimedSol) || 0;
      }
    }
  } catch {
    /* desk still loads */
  }
  let jupSol = 0;
  let jupUsdc = 0;
  try {
    const j = await jupReferralBalances();
    jupSol = Number(j.sol) || 0;
    jupUsdc = Number(j.usdc) || 0;
  } catch {
    /* desk still loads */
  }

  const ownerReady = Number(desk.claimable.ownerReadySol) || 0;
  const ownerFromOnchain = dbcPartnerSol * 0.5 + jupSol * 0.25;
  const streams = desk.streams.map((row) => {
    if (row.id === "pad-treasury") {
      return { ...row, accruedSol: Math.max(row.accruedSol, dbcPartnerSol) };
    }
    if (row.id === "swap") {
      return { ...row, accruedSol: Math.max(row.accruedSol, jupSol) };
    }
    if (row.id === "pad-owner") {
      return { ...row, accruedSol: ownerReady + ownerFromOnchain };
    }
    return row;
  });

  return {
    ...desk,
    streams,
    accrued: {
      ...desk.accrued,
      treasurySol: desk.accrued.treasurySol + dbcPartnerSol + jupSol,
      ownerSol: ownerReady + ownerFromOnchain,
    },
    claimable: {
      ...desk.claimable,
      ownerSol: ownerReady + ownerFromOnchain,
      ownerReadySol: ownerReady,
      treasuryOnchainSol: dbcPartnerSol + jupSol,
      dbcPartnerSol,
      jupSol,
      jupUsdc,
    },
  };
}
