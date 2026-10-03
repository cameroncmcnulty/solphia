import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_OWNER, DEFAULT_TREASURY } from "../lib/protocolWallets";
import {
  feeVaultAddress,
  feeVaultKeypair,
  payoutAddress,
  vaultClaimableLamports,
  VAULT_KEEP_LAMPORTS,
} from "../lib/fees/vault";
import { harvestSplit } from "../lib/fees/payout";

const SEED = "solphia-test-fee-vault-seed";

describe("fee vaults", () => {
  it("derives a stable wallet per owner that is not the owner pubkey", () => {
    const a = feeVaultAddress(DEFAULT_OWNER, SEED);
    const b = feeVaultAddress(DEFAULT_OWNER, SEED);
    const c = feeVaultAddress(DEFAULT_TREASURY, SEED);
    assert.equal(a, b);
    assert.ok(a.length >= 32);
    assert.notEqual(a, DEFAULT_OWNER);
    assert.notEqual(a, c);
    assert.equal(feeVaultKeypair(DEFAULT_OWNER, SEED)?.publicKey.toBase58(), a);
  });

  it("pays the vault when a seed exists and the live wallet otherwise", () => {
    assert.equal(payoutAddress("not-an-address"), "not-an-address");
  });

  it("keeps rent plus a drain fee in the vault", () => {
    assert.equal(vaultClaimableLamports(VAULT_KEEP_LAMPORTS), 0);
    assert.equal(vaultClaimableLamports(VAULT_KEEP_LAMPORTS + 4_000), 0);
    assert.equal(vaultClaimableLamports(VAULT_KEEP_LAMPORTS + 10_000), 10_000);
  });

  it("does not change the 50/25/25 split, only the destination", () => {
    const full = harvestSplit(1, false, true);
    assert.equal(full.dev + full.owner + full.treasury + full.referral, 1);
    assert.equal(full.dev, 0.5);
    assert.equal(full.owner, 0.25);
    assert.equal(full.treasury, 0.25);
    const partner = harvestSplit(1, true, true);
    assert.equal(partner.dev, 0);
    assert.equal(partner.owner, 0.5);
    assert.equal(partner.treasury, 0.5);
  });
});
