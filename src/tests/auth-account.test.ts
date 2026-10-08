import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  attachWallet,
  createEmailAccount,
  detachWallet,
  loginEmail,
  publicAccount,
  upsertGoogleAccount,
  type LoginAccount,
} from "../lib/auth/accounts";
import { hashPassword, passwordOk, verifyPassword } from "../lib/auth/password";
import { accountToken } from "../lib/auth/session";
import { verifyToken } from "../lib/security";
import { copyText } from "../lib/copyText";
import { issueChallenge, verifyBot, verifyMathChallenge } from "../lib/auth/challenge";
import { consumeSignupOtp, hashOtp, otpMatch, startSignupOtp } from "../lib/auth/otp";
import { buildAdminUsers } from "../lib/admin/users";
import { WALLET_PATHS } from "../lib/wallet/paths";
import { emptyState } from "../lib/store";
import type { AppState } from "../lib/types";

function blank(): AppState {
  return { accounts: [] } as AppState;
}

describe("account login", () => {
  it("hashes passwords and requires upper, lower, and a symbol", () => {
    assert.equal(passwordOk("1234567"), false);
    assert.equal(passwordOk("12345678"), false);
    assert.equal(passwordOk("Hunter22"), false);
    assert.equal(passwordOk("hunter22!"), false);
    assert.equal(passwordOk("HUNTER22!"), false);
    assert.equal(passwordOk("Hunter22!"), true);
    const hash = hashPassword("Hunter22!");
    assert.equal(hash.startsWith("scrypt$"), true);
    assert.equal(verifyPassword("Hunter22!", hash), true);
    assert.equal(verifyPassword("Hunter23!", hash), false);
  });

  it("creates an email account only with TOS and never puts the hash in the public shape", () => {
    const s = blank();
    const denied = createEmailAccount(s, { email: "a@solphia.io", password: "Hunter22!", tos: false, privacy: true });
    assert.equal(denied.ok, false);
    const out = createEmailAccount(s, { email: "A@Solphia.io", password: "Hunter22!", tos: true, privacy: true, verified: true });
    assert.equal(out.ok, true);
    if (!out.ok) return;
    assert.equal(out.account.emailNorm, "a@solphia.io");
    assert.ok(out.account.tosAcceptedAt);
    const pub = publicAccount(out.account);
    assert.equal(JSON.stringify(pub).includes("password"), false);
    assert.equal(JSON.stringify(pub).includes("scrypt"), false);
    assert.equal(pub.email, "a@solphia.io");
    const dup = createEmailAccount(s, { email: "a@solphia.io", password: "Hunter22!", tos: true, privacy: true });
    assert.equal(dup.ok, false);
  });

  it("logs in with email and attaches public wallets only", () => {
    const s = blank();
    const made = createEmailAccount(s, { email: "b@solphia.io", password: "Hunter22!", tos: true, privacy: true, verified: true });
    assert.equal(made.ok, true);
    const bad = loginEmail(s, { email: "b@solphia.io", password: "nope-nope" });
    assert.equal(bad.ok, false);
    const ok = loginEmail(s, { email: "b@solphia.io", password: "Hunter22!" });
    assert.equal(ok.ok, true);
    if (!ok.ok) return;
    const pk = "D4uCNcBKAbG9NAkmhQg7pBiztuejNzbWrZDcZmFGut81";
    assert.equal(attachWallet(ok.account, pk).ok, true);
    assert.deepEqual(ok.account.wallets, [pk]);
    assert.equal(attachWallet(ok.account, "not-a-key").ok, false);
    assert.equal(detachWallet(ok.account, pk).ok, true);
    assert.deepEqual(ok.account.wallets, []);
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

  it("blocks login until the email one-time code is verified", () => {
    const s = blank();
    const made = createEmailAccount(s, { email: "raw@solphia.io", password: "Hunter22!", tos: true, privacy: true });
    assert.equal(made.ok, true);
    const blocked = loginEmail(s, { email: "raw@solphia.io", password: "Hunter22!" });
    assert.equal(blocked.ok, false);
    if (!blocked.ok) assert.equal(blocked.error, "verify_email");
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

describe("signup bot check and OTP", () => {
  it("issues a math challenge that only the right sum passes", () => {
    const chal = issueChallenge();
    const payload = chal.prompt.match(/What is (\d+) \+ (\d+)\?/);
    assert.ok(payload);
    const sum = String(Number(payload![1]) + Number(payload![2]));
    assert.equal(verifyMathChallenge(chal.token, sum), true);
    assert.equal(verifyMathChallenge(chal.token, "0"), false);
    assert.equal(verifyMathChallenge("junk", sum), false);
  });

  it("rejects a filled honeypot", async () => {
    const chal = issueChallenge();
    const payload = chal.prompt.match(/What is (\d+) \+ (\d+)\?/);
    const sum = String(Number(payload![1]) + Number(payload![2]));
    const bot = await verifyBot({ website: "https://spam.example", challengeToken: chal.token, challengeAnswer: sum });
    assert.equal(bot.ok, false);
    const ok = await verifyBot({ website: "", challengeToken: chal.token, challengeAnswer: sum });
    assert.equal(ok.ok, true);
  });

  it("blocks password signup on a Google-only email", () => {
    const s = blank();
    const g = upsertGoogleAccount(s, { googleId: "g2", email: "g2@solphia.io", tos: true, privacy: true });
    assert.equal(g.ok, true);
    const started = startSignupOtp(s, { email: "g2@solphia.io", password: "Hunter22!", tos: true, privacy: true });
    assert.equal(started.ok, false);
  });

  it("enforces a resend cooldown on the same email", () => {
    const s = blank();
    const first = startSignupOtp(s, { email: "cd@solphia.io", password: "Hunter22!", tos: true, privacy: true });
    assert.equal(first.ok, true);
    const again = startSignupOtp(s, { email: "cd@solphia.io", password: "Hunter22!", tos: true, privacy: true });
    assert.equal(again.ok, false);
  });

  it("emails a hashed one-time code and only then creates a verified account", () => {
    const s = blank();
    const started = startSignupOtp(s, { email: "otp@solphia.io", password: "Hunter22!", tos: true, privacy: true });
    assert.equal(started.ok, true);
    if (!started.ok) return;
    assert.equal(s.signupPending?.length, 1);
    assert.equal(s.signupPending?.[0]?.otpHash, hashOtp("otp@solphia.io", started.otp));
    assert.equal(otpMatch("otp@solphia.io", started.otp, s.signupPending![0].otpHash), true);
    const bad = consumeSignupOtp(s, { email: "otp@solphia.io", otp: "000000" });
    assert.equal(bad.ok, false);
    const good = consumeSignupOtp(s, { email: "otp@solphia.io", otp: started.otp });
    assert.equal(good.ok, true);
    if (!good.ok) return;
    const made = createEmailAccount(s, {
      email: good.pending.emailNorm,
      passwordHash: good.pending.passwordHash,
      tos: true,
      privacy: true,
      verified: true,
    });
    assert.equal(made.ok, true);
    if (!made.ok) return;
    assert.ok(made.account.emailVerifiedAt);
    const login = loginEmail(s, { email: "otp@solphia.io", password: "Hunter22!" });
    assert.equal(login.ok, true);
  });
});

describe("admin user desk", () => {
  it("lists email logins even before they make a wallet", () => {
    const s = emptyState();
    const made = createEmailAccount(s, {
      email: "desk@solphia.io",
      password: "Hunter22!",
      tos: true,
      privacy: true,
      verified: true,
    });
    assert.equal(made.ok, true);
    const rows = buildAdminUsers(s);
    const hit = rows.find((u) => u.email === "desk@solphia.io");
    assert.ok(hit);
    assert.equal(hit?.auth, "email");
    assert.equal(hit?.emailVerified, true);
    assert.equal(hit?.pubkey, "");
    assert.equal(hit?.walletCount, 0);
  });

  it("lists unverified email signups so admin can mark them", () => {
    const s = emptyState();
    const made = createEmailAccount(s, {
      email: "rawdesk@solphia.io",
      password: "Hunter22!",
      tos: true,
      privacy: true,
    });
    assert.equal(made.ok, true);
    const hit = buildAdminUsers(s).find((u) => u.email === "rawdesk@solphia.io");
    assert.ok(hit);
    assert.equal(hit?.emailVerified, false);
    assert.equal(hit?.auth, "email");
    assert.equal(hit?.accountId, made.ok ? made.account.id : null);
  });
});

