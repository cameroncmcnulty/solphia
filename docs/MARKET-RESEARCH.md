# Solphia market research (2026-08-31)

Sources used to calibrate the safety engine and fee model.

## Survival

- CoinGecko (18.67M Pump.fun tokens, Jan 2024–Jun 2026): **68.67%** die on launch day. **4.55%** last 90+ days.
- Dune (kelly_onchain): weekly graduation often **~0.74%**. Tens of thousands of launches, a few dozen graduates.
- Dune (koreasatoshi535): **97.6%** fail to attract 5+ unique wallets after 72h. Survivors had **13x trades / 19x volume** in hour one. 200+ first-hour trades survive at **9.8%** (4x average).
- Solidus Labs: **98.6%** of Pump.fun tokens flagged as scam/fraudulent flow; **93%** of sampled Raydium pools showed soft-rug characteristics.
- Dune trader study: **56.23%** of wallets lost money. Median realized profit **$0.02**. Top 1% **$18k+**.

## Venue map

- Pump.fun bonding curve still dominates new mints. After March 2025, graduates go to **PumpSwap**, not Raydium (Raydium lost a large meme-fee slice).
- Raydium **LaunchLab** (and letsbonk.fun on the same program) is the second launchpad. Lifetime 1.3M+ LaunchLab tokens; daily graduation still low-single-digit percent.
- Terminals: Axiom / GMGN / Fomo lead volume. Photon faded. **BullX paused trading June 2026** — platform risk is real. Telegram bots (Trojan) still matter.

## Fees

Industry headline is **~1% per trade**. Effective round-trip with priority + slippage + MEV is often **3–6%**. Cheapest names sit near **0.4–0.8%** with cashback.

Solphia: **35 bps (0.35%)** on notional + **0.15 SOL / 30 days** for the alert wire. Paper book subtracts fee and modeled slippage so the $1,000 track is not cosmetic.

## Failure modes we filter

1. Freeze-authority abuse
2. Unlocked LP withdrawal after graduation
3. Bundled sniper dumps (bundle > 55% veto)
4. Serial deployers (death rate > 85% with 3+ tokens)
5. NSFW livestream rugs
6. Thin unique flow after the first minutes
7. Copying every "smart" wallet (most copy too late)

## Strategy gates

- Launch snipe: score ≥ 78, age ≤ 8m, unique ≥ 25, bundle < 28%
- Migration snipe: score ≥ 70, bonding ≥ 82% or just graduated, unique ≥ 40
- Copy: score ≥ 68 and smart-money / organic unique
- Scalp: score ≥ 74, liquidity > $25k, age > 15m

Default action is **do not trade**.
