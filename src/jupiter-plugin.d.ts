export {};

declare global {
  interface Window {
    Jupiter?: {
      init: (props: {
        displayMode?: "modal" | "integrated" | "widget";
        integratedTargetId?: string;
        defaultExplorer?: string;
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
    };
  }
}
