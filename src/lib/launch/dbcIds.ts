/** Meteora Dynamic Bonding Curve. Jupiter instant-routes this program, so Phantom Swap can buy pre-grad. */
export const DBC_PROGRAM_ID = "dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN";
export const DBC_CONFIG =
  (process.env.NEXT_PUBLIC_SOLPHIA_DBC_CONFIG || "").trim() || "5G12fgecRgXNzGaYoaPUAMmNv5C8nprbNtHZznHx81kK";

/** Off until Vercel can ship the DBC client. Flip after that deploy is green. */
export const DBC_LIVE = false;

export function dbcEnabled(): boolean {
  return DBC_LIVE && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(DBC_CONFIG);
}
