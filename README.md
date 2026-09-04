# SOLPHIA

Non-custodial SOL ↔ official tokenized S&P 500 (SPYx / xStocks) bot on Solana. Paper first. Kill switch on. Keys stay on the user’s device.

**Site:** [solphia.io](https://solphia.io)  
**GitHub:** `cameroncmcnulty/solphia`

## What she does

- One job: trade SOL against official SPYx (`XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W`)
- Mean-revert the SOL/SPYx ratio (or hold a target mix)
- Pyth oracles, Jupiter quotes, skip on stale/thin/junk routes
- Paper book with USDC marks, skip tape, flatten-to-USDC on stop or kill
- Phantom / Solflare. She never holds keys.
- Spot only in v1. Leverage slider stays disabled.

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
