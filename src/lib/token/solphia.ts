/** Protocol token. Fill `mint` when the CA is live; the Token page reads this. */
export const SOLPHIA_TOKEN = {
  name: "Solphia",
  symbol: "SOLPHIA",
  mint: "",
  decimals: 9,
  website: "https://solphia.io",
  x: "",
  telegram: "",
  discord: "",
};

export type TokenStat = {
  k: string;
  v: string;
  hint?: string;
};

function dash(n: number | null | undefined, fmt?: (n: number) => string) {
  if (n == null || !Number.isFinite(n)) return "—";
  return fmt ? fmt(n) : String(n);
}

export function solphiaTokenDesk() {
  const mint = (SOLPHIA_TOKEN.mint || "").trim();
  return {
    name: SOLPHIA_TOKEN.name,
    symbol: SOLPHIA_TOKEN.symbol,
    mint,
    caReady: Boolean(mint),
    links: {
      website: SOLPHIA_TOKEN.website || undefined,
      x: SOLPHIA_TOKEN.x || undefined,
      telegram: SOLPHIA_TOKEN.telegram || undefined,
      discord: SOLPHIA_TOKEN.discord || undefined,
    },
    stats: [
      { k: "Price", v: "—", hint: "USD" },
      { k: "Market cap", v: "—", hint: "USD" },
      { k: "Liquidity", v: "—", hint: "USD" },
      { k: "Vol 24h", v: "—", hint: "USD" },
      { k: "Holders", v: "—" },
      { k: "Total supply", v: "—" },
      { k: "Circulating", v: "—" },
      { k: "Burned", v: "—", hint: "tokens" },
      { k: "% burned", v: "—" },
      { k: "LP locked", v: "—" },
      { k: "Mint", v: "—" },
      { k: "Freeze", v: "—" },
    ] satisfies TokenStat[],
    extra: [
      { k: "Top 10", v: "—" },
      { k: "Age", v: "—" },
      { k: "Decimals", v: dash(SOLPHIA_TOKEN.decimals) },
      { k: "Tax", v: "—" },
    ] satisfies TokenStat[],
  };
}
