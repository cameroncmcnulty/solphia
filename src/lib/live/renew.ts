import { Connection, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { isFounder } from "../access";
import { rpcUrl } from "../config";
import { extendSeat, seatDue, seatLamports } from "../seat";
import { treasuryAddress } from "../treasury";
import type { AppState, TraderAccount } from "../types";
import { loadDelegatedKeypair } from "./signer";
import { sendSignedTx } from "../tx/send";

/** Pay the next seat month from the delegated trading wallet so 24/7 does not need the tab. */
export async function renewLiveSeat(state: AppState, trader: TraderAccount): Promise<boolean> {
  if (!trader.auto?.liveDelegate || trader.book?.killed) return false;
  if (isFounder(state, trader.owner)) return false;
  const user = state.users.find((u) => u.pubkey === trader.owner);
  if (!user || !seatDue(user)) return false;
  const treasury = treasuryAddress();
  if (!treasury) return false;
  const kp = await loadDelegatedKeypair(trader.owner);
  if (!kp) return false;
  const lamports = seatLamports(user.plan);
  if (!(lamports > 0)) return false;
  const conn = new Connection(rpcUrl(), { commitment: "confirmed" });
  const bal = await conn.getBalance(kp.publicKey);
  if (bal < lamports + 8_000) return false;
  const { blockhash } = await conn.getLatestBlockhash();
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: kp.publicKey,
      toPubkey: new PublicKey(treasury),
      lamports,
    }),
  );
  tx.feePayer = kp.publicKey;
  tx.recentBlockhash = blockhash;
  tx.sign(kp);
  const sent = await sendSignedTx(tx, { conn });
  if (!sent.ok) return false;
  extendSeat(user, Date.now(), true, user.plan === "lev" ? "lev" : "live");
  return true;
}

export async function maybeRenewLiveSeats(state: AppState, traders: TraderAccount[], cap = 1): Promise<number> {
  let n = 0;
  for (const t of traders) {
    if (n >= cap) break;
    try {
      if (await renewLiveSeat(state, t)) n += 1;
    } catch {
      /* next tick retries */
    }
  }
  return n;
}
