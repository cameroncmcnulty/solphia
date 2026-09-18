# Solphia pad program

In-house Pump-style bonding curve. 1% fee, no Pump.fun.

Program id (this keypair): `5s26ZJDhyErFMx3ELo9CYXS3Y5BcwZvQ5EceYq8WFv4d`

Keypair: `programs/solphia-pad/keys/program.json` (gitignored).

## Deploy (Windows)

1. Install Rust: https://rustup.rs
2. Install Solana CLI: https://docs.solana.com/cli/install-solana-cli-tools
3. From repo root:

```
cargo build-sbf --manifest-path programs/solphia-pad/Cargo.toml
solana program deploy programs/solphia-pad/target/deploy/solphia_pad.so --program-id programs/solphia-pad/keys/program.json
```

Until this is on mainnet, `/launch` simulate will fail with `curve_missing` / program not found.

Fee destinations: treasury `BobXWqFWhRwyBS3Wra3fornbmnwpmN1Ctp5brN1RZ9y3`, owner `AidbgKaN6BhMmqQSERaW2rc3i8Dax4i295q3UTpTdhg4`. `init_global` (disc 0) rotates them.
