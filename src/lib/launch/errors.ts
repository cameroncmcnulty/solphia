import { DEV_BUY_MAX_SOL } from "./curve";

export const LAUNCH_ERRORS: Record<string, string> = {
  not_found: "That coin is not on the tape. Refresh and try again.",
  bad_wallet: "Connect a valid Phantom wallet first.",
  bad_name: "Name must be 2–24 characters.",
  bad_ticker: "Ticker must be 2–10 letters or numbers.",
  ticker_taken: "That ticker is already live on the curve.",
  bad_image: "Use a PNG or JPEG. We store a 512px square so it stays on the tape.",
  dev_buy_cap: `Dev buy at launch is capped at ${DEV_BUY_MAX_SOL} SOL.`,
  anti_snipe: "First 60 seconds: max 1 SOL per buy (sniper cap).",
  wallet_cap: "That buy would put this wallet over the 2% supply cap.",
  graduated: "This coin already graduated. Curve trading is closed.",
  too_small: "Minimum trade is 0.01 SOL.",
  too_large: "Maximum trade is 40 SOL.",
  not_enough: "You do not hold that many tokens.",
  not_enough_sold: "Not enough tokens have been sold to unwind that size.",
  curve_empty: "The curve does not have that many tokens left.",
  zero_out: "That size would print zero tokens.",
  fee_eats_trade: "Fee would eat the whole trade.",
  not_creator: "Only the creator can withdraw dev rewards.",
  empty: "Nothing to withdraw.",
  not_owner: "Owner wallet only.",
  rate_limited: "Too many requests. Wait a few seconds.",
  bad_request: "Bad request. Check the amount and try again.",
  admin_only: "Admin only.",
};

export function launchError(code?: string): string {
  if (!code) return "Trade failed.";
  return LAUNCH_ERRORS[code] || code.replace(/_/g, " ");
}
