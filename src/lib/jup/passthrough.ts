import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { loadOwner, persistOwner } from "@/lib/wallet/owner";
import {
  inPhantomWebView,
  injectedProvider,
  openPhantomUl,
  PHANTOM_REDIRECT,
  phantomSignError,
  waitForInjected,
} from "@/lib/wallet/phantomConnect";
import { phantomProvider, signPhantomAndSend } from "@/lib/wallet/trading";
import { bytesToB64 } from "@/lib/solana/wire";
import { markPhantomSwapPending } from "@/lib/jup/swapNotice";

function txToB64(tx: Transaction | VersionedTransaction): string {
  if ("instructions" in tx && Array.isArray(tx.instructions)) {
    return bytesToB64(Uint8Array.from(tx.serialize({ requireAllSignatures: false, verifySignatures: false })));
  }
  return bytesToB64((tx as VersionedTransaction).serialize());
}

function noopOn() {
  return undefined;
}

async function ensureConnect(): Promise<void> {
  const found = injectedProvider();
  if (!found?.connect) return;
  try {
    const res = await found.connect();
    const pk = res?.publicKey?.toString();
    if (pk) persistOwner(pk);
  } catch (e) {
    throw phantomSignError(e);
  }
}

async function signOne(tx: unknown) {
  await ensureConnect();
  let provider = phantomProvider();
  if (!provider) {
    await waitForInjected(inPhantomWebView() ? 8000 : 600);
    provider = phantomProvider();
  }
  if (provider) {
    try {
      return await provider.signTransaction(tx as Transaction | VersionedTransaction);
    } catch (e) {
      throw phantomSignError(e);
    }
  }
  if (inPhantomWebView()) {
    throw new Error("Pull down to refresh this tab, then swap again.");
  }
  markPhantomSwapPending();
  try {
    await openPhantomUl({
      packed: txToB64(tx as Transaction | VersionedTransaction),
      after: { kind: "jup_swap", owner: loadOwner() || undefined },
      pubkey: loadOwner(),
    });
  } catch (e) {
    if (e instanceof Error && e.message === PHANTOM_REDIRECT) {
      // Jupiter treats a thrown sign as Swap Failed. Stay pending while Phantom opens.
      await new Promise<never>(() => undefined);
    }
    throw phantomSignError(e);
  }
  await new Promise<never>(() => undefined);
}

/**
 * Jupiter Plugin WalletContextState.
 * A Solphia pubkey is enough to show connected — signing waits for injected Phantom.
 * Shape matches @jup-ag/wallet-adapter: publicKey.toString/toBase58, wallet.adapter.publicKey, top-level signTransaction.
 */
export function jupWalletState(pubkey: string | null) {
  const inj = injectedProvider();
  const pkStr = inj?.publicKey?.toString() || pubkey || "";
  let publicKey: PublicKey | null = null;
  try {
    if (pkStr) publicKey = new PublicKey(pkStr);
  } catch {
    publicKey = null;
  }
  const connected = Boolean(publicKey);

  const signTransaction = async (tx: unknown) => signOne(tx);
  const signAllTransactions = async (txs: unknown[]) => {
    const out: unknown[] = [];
    for (const tx of txs) out.push(await signOne(tx));
    return out;
  };
  const sendTransaction = async (tx: unknown) => signPhantomAndSend(txToB64(tx as Transaction | VersionedTransaction));
  const connect = async () => {
    await ensureConnect();
  };

  const adapter = connected
    ? {
        name: "Phantom",
        url: "https://phantom.app",
        icon: "https://solphia.io/favicon.png",
        readyState: "Installed" as const,
        publicKey,
        connecting: false,
        connected: true,
        supportedTransactionVersions: new Set(["legacy", 0] as const),
        connect,
        disconnect: async () => undefined,
        signTransaction,
        signAllTransactions,
        sendTransaction,
        on: noopOn,
        off: noopOn,
        once: noopOn,
        emit: () => false,
        removeAllListeners: noopOn,
      }
    : null;

  const wallet = adapter ? { adapter, readyState: "Installed" as const } : null;

  return {
    autoConnect: false,
    wallets: wallet ? [wallet] : [],
    wallet,
    publicKey,
    connecting: false,
    connected,
    disconnecting: false,
    select: () => undefined,
    connect,
    disconnect: async () => undefined,
    signTransaction: connected ? signTransaction : undefined,
    signAllTransactions: connected ? signAllTransactions : undefined,
    sendTransaction,
    signMessage: undefined,
    signIn: undefined,
  };
}

export function syncJupiterWallet(pubkey: string | null) {
  if (typeof window === "undefined" || !window.Jupiter?.syncProps) return;
  window.Jupiter.enableWalletPassthrough = true;
  window.Jupiter.syncProps({ passthroughWalletContextState: jupWalletState(pubkey) });
}
