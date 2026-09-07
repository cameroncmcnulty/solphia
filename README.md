# SOLPHIA

Non-custodial bot that trades SOL against official SPYx (S&P 500), QQQx (Nasdaq-100), and GLDx (gold) on Solana. Practice first. Kill switch on. Keys stay in Phantom.

**Site:** [solphia.io](https://solphia.io)  
**GitHub:** `cameroncmcnulty/solphia`

## What she does

- One job: trade SOL against official SPYx, QQQx, and GLDx
- Sells SOL when it looks expensive vs those markets, buys SOL back when it looks cheap
- Jupiter quotes, skip on stale/thin/junk routes
- Paper book, activity tape, flatten on stop or kill
- Phantom only. She never holds keys.
- Spot only. Settings are locked to the safer defaults.

## Testing vs live

| | Testing (now) | Live |
|---|---|---|
| Fills | Paper at mid/quote | User-signed Jupiter swap |
| Feeds | Pyth, Jupiter, DexScreener, Binance SOL, Yahoo SPY | Same |
| Subscribe | Paper seat | 0.15 SOL / 30d when treasury is set |
| RPC | Public Solana RPC | `mainnet.helius-rpc.com` if `HELIUS_API_KEY` |

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
