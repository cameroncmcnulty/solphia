# SOLPHIA

Non-custodial Solana memecoin terminal. Paper trading on live Pump.fun, LaunchLab, Raydium and DexScreener events until Helius is connected.

**Site:** [solphia.io](https://solphia.io)  
**GitHub:** `cameroncmcnulty/solphia`

## What she does

- Safety score **0–100** on every coin (research-calibrated, vetoes rugs)
- Copy / launch sniper / migration sniper / scalp — narrow gates
- Live **$1,000 paper book** with 0.35% fee + slippage modeled in
- Phantom / Solflare connect (keys never leave the wallet)
- 0.15 SOL / month alert wire (SMTP or in-app outbox)
- Admin command deck

## Testing vs live

| | Testing (now) | Live (Helius) |
|---|---|---|
| Fills | Paper | On-chain swaps |
| Feeds | Pump.fun, LaunchLab, DexScreener, GeckoTerminal, Raydium | + Helius enhanced txs / wallet stream |
| Subscribe | Paper seat or on-chain 0.15 SOL when `SOLPHIA_TREASURY` is set | Same |
| RPC | Public Solana RPC | `mainnet.helius-rpc.com` |

`LIVE_TRADING` stays `false` until the paper book is proven.

## Run

```bash
cd solphia
copy .env.example .env.local
npm install
npm test
npm run dev
```

Open [http://localhost:3100](http://localhost:3100)

Set `ADMIN_SECRET` then visit `/admin`.

## Security

- No private keys, ever
- SIWS session, httpOnly cookies, HMAC admin cookie
- CSP, frame deny, rate limits, input sanitization
- CORS allowlist for mutating APIs

## Deploy

Point `solphia.io` at Vercel (or any Node host). Add env from `.env.example`. Cron hits `/api/cron/tick` every minute.
