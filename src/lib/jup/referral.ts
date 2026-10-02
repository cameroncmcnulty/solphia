import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { connection } from "../solana/connection";
import { jupFeeStatus, JUP_SOL, JUP_USDC } from "./swapV2";
import { JUP_PLUGIN_ACCOUNT } from "./plugin";

/** Jupiter Referral Program. Fees sit in referral_ata PDAs until claimed. */
export const JUP_REFERRAL_PROGRAM = "REFER4ZgmyYx9c6He5XfaTMiGfdDwREvKaDGsxxEQLs";

export function jupReferralAccount(): string {
  return (jupFeeStatus().referralAccount || JUP_PLUGIN_ACCOUNT || "").trim();
}

export function jupReferralAta(mint: string, referralAccount = jupReferralAccount()): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("referral_ata"), new PublicKey(referralAccount).toBuffer(), new PublicKey(mint).toBuffer()],
    new PublicKey(JUP_REFERRAL_PROGRAM),
  )[0];
}

function walletAta(mint: string, owner: string): PublicKey {
  return getAssociatedTokenAddressSync(new PublicKey(mint), new PublicKey(owner), true, TOKEN_PROGRAM_ID);
}

async function uiAmount(conn: Connection, pk: PublicKey): Promise<number> {
  try {
    const r = await conn.getTokenAccountBalance(pk, "confirmed");
    return Number(r.value.uiAmount) || 0;
  } catch {
    return 0;
  }
}

export type JupReferralBalances = {
  account: string;
  sol: number;
  usdc: number;
  solAta: string;
  usdcAta: string;
};

/** Unclaimed integrator fees sitting in Jupiter referral token accounts. */
export async function jupReferralBalances(): Promise<JupReferralBalances> {
  const account = jupReferralAccount();
  const empty = { account, sol: 0, usdc: 0, solAta: "", usdcAta: "" };
  if (!account) return empty;
  const conn = connection();
  const solPda = jupReferralAta(JUP_SOL, account);
  const usdcPda = jupReferralAta(JUP_USDC, account);
  const solWallet = walletAta(JUP_SOL, account);
  const usdcWallet = walletAta(JUP_USDC, account);
  const [solPdaAmt, usdcPdaAmt, solWalletAmt, usdcWalletAmt] = await Promise.all([
    uiAmount(conn, solPda),
    uiAmount(conn, usdcPda),
    uiAmount(conn, solWallet),
    uiAmount(conn, usdcWallet),
  ]);
  const sol = solPdaAmt + solWalletAmt;
  const usdc = usdcPdaAmt + usdcWalletAmt;
  return {
    account,
    sol,
    usdc,
    solAta: (solPdaAmt > 0 ? solPda : solWallet).toBase58(),
    usdcAta: (usdcPdaAmt > 0 ? usdcPda : usdcWallet).toBase58(),
  };
}
