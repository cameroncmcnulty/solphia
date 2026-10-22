import Link from "next/link";

export default function LegalPage() {
  return (
    <main className="pump-shell">
      <div className="pump-wrap">
      <h1 className="pump-h1">Legal</h1>
      <p className="pump-p mt-3">Last updated 22 October 2026. Solphia is a non-custodial Solana interface. It is not a bank, broker, custodian, money transmitter, or exchange. You use solphia.io entirely at your own risk.</p>

      <h2 id="terms" className="mt-12 scroll-mt-24 font-display text-2xl text-ghost">
        Terms of Service
      </h2>
      <div className="mt-4 space-y-4 text-base leading-relaxed text-mute">
        <p>
          By creating or importing a Solphia wallet, checking the terms boxes, signing a transaction, paying a seat, posting, or otherwise using solphia.io (the “Site”), you agree to these Terms of Service (the “Terms”). If you do not agree, do not use the Site. If you use the Site on behalf of an entity, you represent that you have authority to bind that entity.
        </p>

        <h3 className="pt-2 font-display text-lg text-ghost">1. What Solphia is</h3>
        <p>
          Solphia is software that lets you create or import a wallet on your device and submit transactions you approve to the Solana public blockchain and related programs. We do not take custody of your SOL, tokens, recovery phrase, PIN, or private keys. We do not operate an order book, hold customer deposits, guarantee fills, or act as your agent. Nothing on the Site is an offer to buy, sell, or broker any security, commodity, or other financial instrument.
        </p>

        <h3 className="pt-2 font-display text-lg text-ghost">2. Your wallet, keys, and backups</h3>
        <p>
          Login is a Solphia wallet you create or import on this device. You write down a 12-word recovery phrase and set a PIN. The phrase and PIN stay in this browser, encrypted with that PIN. We do not receive them and cannot recover them. You are solely responsible for storing the phrase offline, keeping the PIN secret, and controlling any device that can unlock the wallet. Clearing this browser, losing the device, forgetting the PIN, sharing the phrase, malware, a compromised clipboard, or a phishing site can make funds unrecoverable. Solphia cannot reset access, reverse a signed transfer, or restore missing balances. Some on-chain pays, claims, launches, and swaps are signed in this wallet. A signature you approve is your instruction to the network, not ours.
        </p>

        <h3 className="pt-2 font-display text-lg text-ghost">3. You use the Site at your own risk</h3>
        <p>
          Digital assets are volatile and experimental. Smart contracts, tokens, liquidity pools, oracles, bridges, and routing software can contain bugs, be paused, be exploited, or fail. Prices can go to zero. Transactions can land late, land twice, land with worse prices than quoted, fail after you signed, or never confirm. RPC nodes, block producers, and third-party routers can drop, reorder, or simulate a transaction differently from what actually executes. You accept all of that risk. You are solely responsible for checking the mint, amount, destination, slippage, and fees before you sign. If SOL, tokens, or other value are lost, missing, delayed, sent to the wrong address, stuck in a program, drained by a token you traded, or reduced by fees, MEV, congestion, or slippage, that loss is yours. Solphia is not responsible for lost or missing funds from transactions or from any other use of the Site.
        </p>

        <h3 className="pt-2 font-display text-lg text-ghost">4. Products on the Site</h3>
        <p>
          The desk trades tokenized S&amp;P 500, Nasdaq, gold, and SOL via official xStock mints. She stays off until you pay the SOL seat, fund the trading wallet, and press Start. Paper and backtests sign on this device. When you start Live, this site stores an encrypted copy of the trading-wallet secret so the desk can sign while you are away. Stop Live or revoke that key anytime. Markets move. You can lose SOL, including the entire trading-wallet balance. Live trading, auto-pilot, and any strategy display are tools, not promises of profit. This is not financial, tax, legal, or investment advice. Tokens shown on the launch pad and Shill Zone are not endorsed, audited, or guaranteed by Solphia. A launch, swap, boost, pin, or chat mention is not a recommendation.
        </p>
        <p>
          Live seats are paid in SOL for a 30-day window as listed on the pricing page (Live 0.1 SOL, SOL 2×/3× 0.15 SOL). First payment is signed in your wallet. Later months may renew from the trading wallet while this site is open. Unsubscribe any time. We do not refund a started window, a failed on-chain payment, or unused time. Optional 2×/3× is on SOL only; equities and gold stay spot. Leverage can liquidate. You can lose more than you expect, including your posted margin, in a short window.
        </p>
        <p>
          Pad trades go through the Solphia on-chain program. Quotes, caps, and fees are protocol and interface rules, not a guarantee that a trade will land or that a token will keep trading. The live desk uses Jupiter and other third-party liquidity to reach official xStock markets. Routes, impact, and available size can change between quote and land.
        </p>

        <h3 className="pt-2 font-display text-lg text-ghost">5. Fees</h3>
        <p>
          The Site and on-chain programs may charge protocol, routing, priority, or display fees in addition to Solana network fees. Fee amounts can change. Paying a fee does not make Solphia a custodian or a counterparty to your trade. You still bear all market and execution risk.
        </p>

        <h3 className="pt-2 font-display text-lg text-ghost">6. Public rooms and content</h3>
        <p>
          Shill Zone, launch, $SPHA pages, and chat are public. Do not post illegal content, malware, or other people’s private keys or phrases. We may mute, ban, hide, or delete material to keep the room usable. We have no duty to monitor. Boosts and pins are paid placements, not investment offers. You grant Solphia a worldwide license to host and display content you post on the Site.
        </p>

        <h3 className="pt-2 font-display text-lg text-ghost">7. No warranties</h3>
        <p>
          The Site is provided “as is” and “as available,” without warranties of any kind, whether express, implied, or statutory, including merchantability, fitness for a particular purpose, title, non-infringement, uninterrupted access, or error-free execution. Solana congestion, RPC faults, third-party tokens, wallet software, browsers, and hosting can fail without notice. We do not warrant that a quote, balance, chart, username, or status badge is complete, current, or correct.
        </p>

        <h3 className="pt-2 font-display text-lg text-ghost">8. Limitation of liability</h3>
        <p>
          To the maximum extent permitted by applicable law, Solphia, its operators, contributors, contractors, and affiliates are not liable for any lost, missing, stolen, frozen, delayed, or irrecoverable SOL, tokens, or other value; failed, stuck, duplicated, or unexpected transactions; lost keys, phrases, PINs, or devices; smart-contract bugs or exploits; third-party protocol, RPC, or liquidity failures; token price moves; liquidation; slippage; MEV; downtime; or any indirect, incidental, special, consequential, exemplary, or punitive damages, or lost profits, data, or goodwill, even if we were told they were possible. If a court nevertheless finds liability, it is limited to the greater of ten U.S. dollars (US$10) or the fees you paid to Solphia for the thirty (30) days before the claim. Some places do not allow certain limits; in those places our liability is limited to the fullest extent the law allows. You agree that this allocation of risk is a core part of the bargain for using a free or low-fee non-custodial interface.
        </p>

        <h3 className="pt-2 font-display text-lg text-ghost">9. Indemnity</h3>
        <p>
          You will defend, indemnify, and hold harmless Solphia and its operators, contributors, contractors, and affiliates from claims, damages, losses, and expenses (including reasonable legal fees) arising out of your use of the Site, your wallet, your transactions, your content, your violation of these Terms, or your violation of any law or third-party right.
        </p>

        <h3 className="pt-2 font-display text-lg text-ghost">10. Changes, law, and contact</h3>
        <p>
          We may update these Terms by posting a new version here. The “Last updated” date is the effective date. Continued use after that date is acceptance. If a part of these Terms cannot be enforced, the rest still applies. These Terms are the entire agreement for the Site. For questions email admin@solphia.io. Email is not a way to recover funds or reverse a transaction.
        </p>
      </div>

      <h2 id="privacy" className="mt-12 scroll-mt-24 font-display text-2xl text-ghost">
        Privacy Policy
      </h2>
      <div className="mt-4 space-y-4 text-base leading-relaxed text-mute">
        <p>
          This policy describes what the Site stores when you use Solphia. Blockchain records are public. We cannot make an on-chain transfer private, reverse it, or recover funds sent from your wallet.
        </p>
        <p>
          We collect the public Solana address of the wallet you open, optional username and profile photo, chat and pin activity, referral codes, and technical logs (IP, user agent) used to rate-limit abuse. Circle join stores the email you enter. If you pay a live seat we store the payment signature, the paid-through date, and any email you give at checkout for alerts. When you start Live we store an encrypted copy of the trading-wallet secret until you revoke it. We do not collect your recovery phrase or PIN. We cannot reconstruct them. If you lose them, we cannot help you move the funds.
        </p>
        <p>
          Wallet addresses are public on Solana. Chat, Shill, and launch posts are public. We use a first-party session cookie and local storage (PIN-encrypted vault, trading key on this device) so this browser stays signed in. We do not sell personal information. We do not use your phrase or PIN for advertising.
        </p>
        <p>
          Profile images and launch art may be stored with our host (Vercel) and pinning provider (Pinata). RPC goes through Helius. Pad quotes are computed from our on-chain curve. Live-desk xStock quotes go through Jupiter. Durable desk state and the encrypted live key sit in Redis (Upstash). Mail, when sent, leaves otp@solphia.io or admin@solphia.io. Those providers process data as needed to run the Site. Their outages or errors can affect balances you see and transactions you send. That risk is yours.
        </p>
        <p>
          You can disconnect, clear this browser, revoke the live trading key, or ask us to mute or delete a profile you control. Clearing a profile does not move or recover on-chain funds. On-chain transfers cannot be reversed. For privacy questions email admin@solphia.io.
        </p>
      </div>

      <h2 id="live" className="mt-12 scroll-mt-24 font-display text-2xl text-ghost">Live seat</h2>
      <div className="mt-4 space-y-4 text-base leading-relaxed text-mute">
        <p>
          Live is 0.1 SOL / 30 days. SOL 2×/3× is 0.15 SOL / 30 days. Leverage can liquidate. Live trading can lose some or all of the SOL and tokens in the trading wallet. By checking “I agree” on checkout you authorize the transfer and accept that risk. No refunds after the window starts.
        </p>
        <p>
          Your recovery phrase and PIN stay on this device. Starting Live uploads the trading-wallet secret so the desk can sign. That copy is encrypted at rest and deleted when you revoke it. While Live is on, the desk may send transactions from that wallet without a new click from you. You can stop Live or revoke the key. Activity that already landed on Solana cannot be undone.
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
