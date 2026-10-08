import { PublicKey, Transaction } from "@solana/web3.js";
import { connection } from "../solana/connection";
import { boundReferrer, houseFeeIxs, houseFeeLegs, houseFeeMissing, type HouseFeeMode, type HouseLeg } from "./payout";

export async function unsignedHousePay(
  from: string,
  feeSol: number,
  person?: string,
  mode: HouseFeeMode = "split",
): Promise<{ ok: true; transaction: string; legs: HouseLeg[] } | { ok: false; error: string }> {
  const referrer = boundReferrer(person || from);
  const opts = { from, feeSol, referrer, mode };
  const missing = houseFeeMissing(opts);
  if (missing) return { ok: false, error: missing };
  const legs = houseFeeLegs(opts);
  const ixs = houseFeeIxs(opts);
  if (!ixs.length) return { ok: false, error: "empty" };
  const tx = new Transaction();
  for (const ix of ixs) tx.add(ix);
  tx.feePayer = new PublicKey(from);
  const { blockhash } = await connection().getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  return {
    ok: true,
    transaction: tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64"),
    legs,
  };
}
