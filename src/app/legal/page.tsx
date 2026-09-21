import Link from "next/link";

export default function LegalPage() {
  return (
    <main className="pump-shell">
      <div className="pump-wrap">
      <h1 className="pump-h1">Legal</h1>
      <p className="pump-p mt-3">Last updated 16 September 2026. Solphia is a non-custodial Solana interface. It is not a bank, broker, or exchange.</p>

      <h2 id="terms" className="mt-12 scroll-mt-24 font-display text-2xl text-ghost">
        Terms of Service
      </h2>
      <div className="mt-4 space-y-4 text-base leading-relaxed text-mute">
        <p>
          By connecting a wallet or using solphia.io you agree to these terms. If you do not agree, disconnect and leave.
        </p>
        <p>
          Your wallet is login. Solphia never asks for a seed phrase. Trading keys, if created in the browser, stay on your device. We do not hold, freeze, or recover those keys. Clearing this browser without a backup can make funds unrecoverable.
        </p>
        <p>
          The desk trades tokenized S&amp;P 500, Nasdaq, gold, and SOL via official xStock mints. She stays off until you pay the SOL seat, fund the trading wallet, and press Start. Live swaps are signed by the trading wallet on your device — not by us. Markets move. You can lose SOL. This is not financial, tax, or investment advice. Tokens shown on the launch pad and Shill Zone are not endorsed.
        </p>
        <p>
          Live seats are paid in SOL for a 30-day window as listed on the pricing page. First payment is signed in Phantom. Later months may renew from the on-device trading wallet while this site is open. Unsubscribe any time. We do not refund a started window.
        </p>
        <p>
          Shill Zone, launch, and chat are public. Do not post illegal content. We may mute, ban, or delete to keep the room usable. Boosts and pins are paid placements, not investment offers.
        </p>
        <p>
          The site is provided as-is. Solana congestion, RPC faults, and third-party tokens can fail without notice. Pad trades go through the Solphia on-chain program. The live desk uses Jupiter to reach official xStock liquidity. We are not liable for lost keys, failed transactions, or token price.
        </p>
        <p>
          We may update these terms by posting a new version here. Continued use after the date above is acceptance.
        </p>
      </div>

      <h2 id="privacy" className="mt-12 scroll-mt-24 font-display text-2xl text-ghost">
        Privacy Policy
      </h2>
      <div className="mt-4 space-y-4 text-base leading-relaxed text-mute">
        <p>
          We collect the public Solana address you connect, optional username and profile media you upload, chat and pin activity, referral codes, and technical logs (IP, user agent) used to rate-limit abuse. If you pay a live seat we store the payment signature and the paid-through date. We do not collect seed phrases or private keys.
        </p>
        <p>
          Wallet addresses are public on Solana. Chat is public. We use first-party cookies and local storage so your wallet stays connected in this browser. We do not sell personal information.
        </p>
        <p>
          Profile images and chat media may be stored with our hosting and pinning providers so the site can show them. RPC goes through Helius. Pad quotes are computed from our on-chain curve. Live-desk xStock quotes go through Jupiter. Durable desk state is stored in Redis (Upstash) so it survives deploys.
        </p>
        <p>
          You can disconnect, clear this browser, or ask us to mute or delete a profile you control. On-chain transfers cannot be reversed. For privacy questions use the contact path posted with the project.
        </p>
      </div>

      <h2 className="mt-12 font-display text-2xl text-ghost">Live seat</h2>
      <div className="mt-4 space-y-4 text-base leading-relaxed text-mute">
        <p>
          Live is 0.1 SOL / 30 days. SOL 2×/3× is 0.15 SOL / 30 days. Leverage can liquidate. By checking “I agree” on checkout you authorize the transfer.
        </p>
        <p>
          Solphia never asks for your seed phrase. Your trading key stays on your phone or computer.
        </p>
        <p>
          <Link href="/pricing" className="text-acid">
            Back to pricing
          </Link>
        </p>
      </div>
      </div>
    </main>
  );
}
