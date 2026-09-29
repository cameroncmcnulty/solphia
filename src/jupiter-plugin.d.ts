export {};

type JupWalletState = {
  publicKey?: { toBase58(): string } | null;
  connected?: boolean;
  connecting?: boolean;
  disconnecting?: boolean;
  wallet?: { adapter?: { name?: string; icon?: string; url?: string; connected?: boolean } } | null;
  connect?: () => Promise<void>;
  disconnect?: () => Promise<void>;
  signTransaction?: (tx: unknown) => Promise<unknown>;
  signAllTransactions?: (txs: unknown[]) => Promise<unknown[]>;
  sendTransaction?: (tx: unknown) => Promise<string>;
};

declare global {
  interface Window {
    Jupiter?: {
      init: (props: {
        displayMode?: "modal" | "integrated" | "widget";
        integratedTargetId?: string;
        defaultExplorer?: string;
        autoConnect?: boolean;
        enableWalletPassthrough?: boolean;
        passthroughWalletContextState?: JupWalletState;
        onRequestConnectWallet?: () => void | Promise<void>;
        containerStyles?: Record<string, string>;
        containerClassName?: string;
        formProps?: {
          swapMode?: string;
          initialAmount?: string;
          initialInputMint?: string;
          initialOutputMint?: string;
          fixedAmount?: boolean;
          fixedMint?: string;
          referralAccount?: string;
          referralFee?: number;
        };
        branding?: { logoUri?: string; name?: string };
        onSuccess?: (args: { txid?: string }) => void;
        onSwapError?: (args: { error?: unknown }) => void;
      }) => void;
      close?: () => void;
      syncProps?: (props: { passthroughWalletContextState?: JupWalletState }) => void;
    };
  }
}
