import type { Venue } from "../types";

/** Programs she is allowed to touch. Anything else is a deny. */
export const ALLOWED_PROGRAMS: Partial<Record<Venue, string[]>> = {
  pumpfun: ["6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"],
  pumpswap: ["pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA"],
  launchlab: ["LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj"],
  raydium: [
    "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
    "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C",
  ],
};

export const ALLOWED_VENUES: Venue[] = ["pumpfun", "pumpswap", "launchlab", "raydium"];

export function venueAllowed(venue: Venue): boolean {
  return ALLOWED_VENUES.includes(venue);
}
