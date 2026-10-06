/** Labels that keep the two connect paths distinct. Phantom keys are never exported. */
export const WALLET_PATHS = {
  create: {
    title: "Create a Solphia wallet",
    hint: "Keys stay on this device. Phantom is not involved.",
  },
  import: {
    title: "Import phrase or key",
    hint: "Client-side only. Never sent to Solphia.",
  },
  phantom: {
    title: "Connect Phantom",
    hint: "Your Phantom keys stay in Phantom. We do not export them.",
  },
} as const;

export const CONNECT_WALLET_FIRST = "Connect a wallet first.";

export function solscanTx(sig: string) {
  return `https://solscan.io/tx/${sig}`;
}

export function solscanAccount(pk: string) {
  return `https://solscan.io/account/${pk}`;
}

export function solscanToken(mint: string) {
  return `https://solscan.io/token/${mint}`;
}

export const FOCUS_MINT_KEY = "solphia:focus-mint";
export const FOCUS_SIDE_KEY = "solphia:focus-side";

export function seedSwapMint(mint: string, side: "buy" | "sell" = "buy") {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(FOCUS_MINT_KEY, mint);
    sessionStorage.setItem(FOCUS_SIDE_KEY, side);
  } catch {
    /* private mode */
  }
}
