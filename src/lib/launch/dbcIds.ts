/** Meteora Dynamic Bonding Curve. Jupiter instant-routes this program, so Phantom Swap can buy pre-grad. */
export const DBC_PROGRAM_ID = "dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN";
/** Old partner config: initialMarketCap 4000 SOL ≈ $475k. Do not use for new pools. */
export const LEGACY_DBC_CONFIG = "5G12fgecRgXNzGaYoaPUAMmNv5C8nprbNtHZznHx81kK";
/** Shared SPL pad curve. Token-2022 / $SPHA configs must never replace this. */
export const PAD_DBC_CONFIG = "HqT26zWiJmoDfgjDNbKCh1bQRe8w7RhJetnNXMRSKH3h";
/** $SPHA Token-2022 transfer-hook config. Pad createPool against this fails with discriminator 3002. */
export const SPHA_DBC_CONFIG = "3j6YgnrnwDFobgrnGnvk7g97YNuc4gWXCKA55DMRRqEQ";
export const DBC_CONFIG = (process.env.NEXT_PUBLIC_SOLPHIA_DBC_CONFIG || "").trim();

export const DBC_LIVE = true;

export function dbcEnabled(): boolean {
  return DBC_LIVE;
}

function isPadConfig(pk: string): boolean {
  return pk === PAD_DBC_CONFIG;
}

/** Shared SPL pad config only. Ignores $SPHA Token-2022 and the 4000 SOL legacy curve. */
export function liveDbcConfig(_bookConfig?: string | null): string {
  if (isPadConfig(DBC_CONFIG)) return DBC_CONFIG;
  return PAD_DBC_CONFIG;
}
