import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  attachWallet,
  createEmailAccount,
  loginEmail,
  publicAccount,
  upsertGoogleAccount,
  type LoginAccount,
} from "../lib/auth/accounts";
import { hashPassword, passwordOk, verifyPassword } from "../lib/auth/password";
import { accountToken } from "../lib/auth/session";
import { verifyToken } from "../lib/security";
import { copyText } from "../lib/copyText";
import { WALLET_PATHS } from "../lib/wallet/paths";
import type { AppState } from "../lib/types";

function blank(): AppState {
  return { accounts: [] } as AppState;
}

describe("account login", () => {
  it("hashes passwords and rejects short ones", () => {
    assert.equal(passwordOk("1234567"), false);
    assert.equal(passwordOk("12345678"), true);
    const hash = hashPassword("hunter22");
    assert.equal(hash.startsWith("scrypt$"), true);
    assert.equal(verifyPassword("hunter22", hash), true);
    assert.equal(verifyPassword("hunter23", hash), false);
  });

  it("creates an email account only with TOS and never puts the hash in the public shape", () => {
    const s = blank();
    const denied = createEmailAccount(s, { email: "a@solphia.io", password: "hunter22", tos: false, privacy: true });
    assert.equal(denied.ok, false);
    const out = createEmailAccount(s, { email: "A@Solphia.io", password: "hunter22", tos: true, privacy: true });
    assert.equal(out.ok, true);
    if (!out.ok) return;
    assert.equal(out.account.emailNorm, "a@solphia.io");
    assert.ok(out.account.tosAcceptedAt);
    const pub = publicAccount(out.account);
    assert.equal(JSON.stringify(pub).includes("password"), false);
    assert.equal(JSON.stringify(pub).includes("scrypt"), false);
    assert.equal(pub.email, "a@solphia.io");
    const dup = createEmailAccount(s, { email: "a@solphia.io", password: "hunter22", tos: true, privacy: true });
    assert.equal(dup.ok, false);
  });

  it("logs in with email and attaches public wallets only", () => {
    const s = blank();
    const made = createEmailAccount(s, { email: "b@solphia.io", password: "hunter22", tos: true, privacy: true });
    assert.equal(made.ok, true);
    const bad = loginEmail(s, { email: "b@solphia.io", password: "nope-nope" });
    assert.equal(bad.ok, false);
    const ok = loginEmail(s, { email: "b@solphia.io", password: "hunter22" });
    assert.equal(ok.ok, true);
    if (!ok.ok) return;
    const pk = "D4uCNcBKAbG9NAkmhQg7pBiztuejNzbWrZDcZmFGut81";
    assert.equal(attachWallet(ok.account, pk).ok, true);
    assert.deepEqual(ok.account.wallets, [pk]);
    assert.equal(attachWallet(ok.account, "not-a-key").ok, false);
  });

  it("upserts Google with TOS on first create and links the same email", () => {
    const s = blank();
    const noTos = upsertGoogleAccount(s, { googleId: "g1", email: "g@solphia.io", tos: false, privacy: false });
    assert.equal(noTos.ok, false);
    const made = upsertGoogleAccount(s, { googleId: "g1", email: "g@solphia.io", tos: true, privacy: true });
    assert.equal(made.ok, true);
    if (!made.ok) return;
    assert.equal(made.created, true);
    const again = upsertGoogleAccount(s, { googleId: "g1", email: "g@solphia.io", tos: false, privacy: false });
    assert.equal(again.ok, true);
    if (!again.ok) return;
    assert.equal(again.created, false);
    assert.equal(again.account.id, made.account.id);
  });

  it("signs an account session token", () => {
    const tok = accountToken("acctid123");
    const payload = verifyToken(tok, process.env.ADMIN_SECRET || "solphia-dev-only");
    assert.equal(payload?.startsWith("acct:acctid123:"), true);
  });

  it("copy helper is a no-op without a DOM", () => {
    assert.equal(copyText("twelve words here"), false);
  });

  it("does not advertise Phantom as a login path", () => {
    assert.equal("phantom" in WALLET_PATHS, false);
  });

  it("public account JSON never includes custody fields", () => {
    const row: LoginAccount = {
      id: "x",
      email: "c@solphia.io",
      emailNorm: "c@solphia.io",
      passwordHash: "scrypt$nope",
      googleId: "sub",
      wallets: ["D4uCNcBKAbG9NAkmhQg7pBiztuejNzbWrZDcZmFGut81"],
      createdAt: 1,
      lastSeen: 1,
      tosAcceptedAt: 1,
    };
    const dump = JSON.stringify(publicAccount(row)).toLowerCase();
    assert.equal(dump.includes("password"), false);
    assert.equal(dump.includes("googleid"), false);
    assert.equal(dump.includes("scrypt"), false);
  });
});
