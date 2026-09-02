import type { TokenSnapshot } from "../types";
import { dumpSignal, mergeTxs } from "../desk/fundingGraph";
import { fetchAddressTxs, heliusConfigured } from "./client";

type CacheHit = { at: number; flatten: boolean; reason: string };
const cache = new Map<string, CacheHit>();
const TTL_MS = 20_000;
const MAX_PER_TICK = 6;

export async function tagFundingDumps(tokens: TokenSnapshot[], focusMints: string[]): Promise<number> {
  if (!heliusConfigured()) return 0;
  const focus = new Set(focusMints.filter(Boolean));
  const targets = tokens.filter((t) => focus.has(t.mint)).slice(0, MAX_PER_TICK);
  let tagged = 0;
  await Promise.all(
    targets.map(async (token) => {
      const hit = cache.get(token.mint);
      if (hit && Date.now() - hit.at < TTL_MS) {
        if (hit.flatten) {
          token.fundingDump = true;
          tagged += 1;
        }
        return;
      }
      const mintTxs = await fetchAddressTxs(token.mint, 40);
      const creatorTxs = token.creator ? await fetchAddressTxs(token.creator, 20) : [];
      const sig = dumpSignal({
        mint: token.mint,
        creator: token.creator,
        txs: mergeTxs(mintTxs, creatorTxs),
      });
      cache.set(token.mint, { at: Date.now(), flatten: sig.flatten, reason: sig.reason });
      if (sig.flatten) {
        token.fundingDump = true;
        tagged += 1;
      }
    }),
  );
  return tagged;
}
