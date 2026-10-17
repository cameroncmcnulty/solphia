import Link from "next/link";

export default function LegalPage() {
  return (
    <main className="pump-shell">
      <div className="pump-wrap">
      <h1 className="pump-h1">Legal</h1>
      <p className="pump-p mt-3">Last updated 13 October 2026. Solphia is a non-custodial Solana interface. It is not a bank, broker, or exchange.</p>

      <h2 id="terms" className="mt-12 scroll-mt-24 font-display text-2xl text-ghost">
        Terms of Service
      </h2>
      <div className="mt-4 space-y-4 text-base leading-relaxed text-mute">
        <p>
          By creating or importing a Solphia wallet, checking the terms boxes, or using solphia.io you agree to these terms. If you do not agree, leave.
        </p>
        <p>
          Login is a Solphia wallet you create or import on this device. You write down a 12-word recovery phrase and set a PIN. The phrase and PIN stay in this browser, encrypted with that PIN. We do not receive them and cannot recover them. Clearing this browser without a backup can make funds unrecoverable. Some on-chain pays, claims, and swaps are signed in this wallet.
        </p>
        <p>
          The desk trades tokenized S&amp;P 500, Nasdaq, gold, and SOL via official xStock mints. She stays off until you pay the SOL seat, fund the trading wallet, and press Start. Paper and backtests sign on this device. When you start Live, this site stores an encrypted copy of the trading-wallet secret so the desk can sign while you are away. Stop Live or revoke that key anytime. Markets move. You can lose SOL. This is not financial, tax, or investment advice. Tokens shown on the launch pad and Shill Zone are not endorsed.
        </p>
        <p>
          Live seats are paid in SOL for a 30-day window as listed on the pricing page (Live 0.1 SOL, SOL 2×/3× 0.15 SOL). First payment is signed in your wallet. Later months may renew from the trading wallet while this site is open. Unsubscribe any time. We do not refund a started window. Optional 2×/3× is on SOL only; equities and gold stay spot. Leverage can liquidate.
        </p>
        <p>
          Shill Zone, launch, $SPHA pages, and chat are public. Do not post illegal content. We may mute, ban, or delete to keep the room usable. Boosts and pins are paid placements, not investment offers.
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
          We collect the public Solana address of the wallet you open, optional username and profile photo, chat and pin activity, referral codes, and technical logs (IP, user agent) used to rate-limit abuse. Circle join stores the email you enter. If you pay a live seat we store the payment signature, the paid-through date, and any email you give at checkout for alerts. When you start Live we store an encrypted copy of the trading-wallet secret until you revoke it. We do not collect your recovery phrase or PIN.
        </p>
        <p>
          Wallet addresses are public on Solana. Chat, Shill, and launch posts are public. We use a first-party session cookie and local storage (PIN-encrypted vault, trading key on this device) so this browser stays signed in. We do not sell personal information.
        </p>
        <p>
          Profile images and launch art may be stored with our host (Vercel) and pinning provider (Pinata). RPC goes through Helius. Pad quotes are computed from our on-chain curve. Live-desk xStock quotes go through Jupiter. Durable desk state and the encrypted live key sit in Redis (Upstash). Mail, when sent, leaves otp@solphia.io or admin@solphia.io.
        </p>
        <p>
          You can disconnect, clear this browser, revoke the live trading key, or ask us to mute or delete a profile you control. On-chain transfers cannot be reversed. For privacy questions email admin@solphia.io.
        </p>
      </div>

      <h2 id="live" className="mt-12 scroll-mt-24 font-display text-2xl text-ghost">Live seat</h2>
      <div className="mt-4 space-y-4 text-base leading-relaxed text-mute">
        <p>
          Live is 0.1 SOL / 30 days. SOL 2×/3× is 0.15 SOL / 30 days. Leverage can liquidate. By checking “I agree” on checkout you authorize the transfer.
        </p>
        <p>
          Your recovery phrase and PIN stay on this device. Starting Live uploads the trading-wallet secret so the desk can sign. That copy is encrypted at rest and deleted when you revoke it.
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
