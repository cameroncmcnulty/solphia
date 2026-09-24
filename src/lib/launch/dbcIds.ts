/** Meteora Dynamic Bonding Curve. Jupiter instant-routes this program, so Phantom Swap can buy pre-grad. */
export const DBC_PROGRAM_ID = "dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN";
/** Old partner config: initialMarketCap 4000 SOL ≈ $475k. Do not use for new pools. */
export const LEGACY_DBC_CONFIG = "5G12fgecRgXNzGaYoaPUAMmNv5C8nprbNtHZznHx81kK";
export const DBC_CONFIG = (process.env.NEXT_PUBLIC_SOLPHIA_DBC_CONFIG || "").trim();

export const DBC_LIVE = true;

function isPk(s: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);
}

export function dbcEnabled(): boolean {
  return DBC_LIVE;
}

/** Good shared config only. Never the 4000 SOL legacy curve. */
export function liveDbcConfig(bookConfig?: string | null): string {
  const fromBook = (bookConfig || "").trim();
  if (isPk(fromBook) && fromBook !== LEGACY_DBC_CONFIG) return fromBook;
  if (isPk(DBC_CONFIG) && DBC_CONFIG !== LEGACY_DBC_CONFIG) return DBC_CONFIG;
  return "";
}
