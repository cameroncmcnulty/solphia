import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  attachWallet,
  createEmailAccount,
  detachWallet,
  findByWallet,
  loginEmail,
  mergeLoginAccounts,
  openWalletAccount,
  publicAccount,
  upsertGoogleAccount,
  type LoginAccount,
} from "../lib/auth/accounts";
import { hashPassword, passwordOk, verifyPassword } from "../lib/auth/password";
import { accountToken, readClaimTicket, signClaimTicket } from "../lib/auth/session";
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

  it("logs each email into its own account, never the other", () => {
    const s = blank();
    const a = createEmailAccount(s, { email: "alpha@solphia.io", password: "Hunter22!", tos: true, privacy: true, verified: true });
    const b = createEmailAccount(s, { email: "bravo@solphia.io", password: "Hunter23!", tos: true, privacy: true, verified: true });
    assert.equal(a.ok, true);
    assert.equal(b.ok, true);
    if (!a.ok || !b.ok) return;
    const loginA = loginEmail(s, { email: "alpha@solphia.io", password: "Hunter22!" });
    const loginB = loginEmail(s, { email: "bravo@solphia.io", password: "Hunter23!" });
    assert.equal(loginA.ok, true);
    assert.equal(loginB.ok, true);
    if (!loginA.ok || !loginB.ok) return;
    assert.equal(loginA.account.id, a.account.id);
    assert.equal(loginB.account.id, b.account.id);
    assert.notEqual(loginA.account.id, loginB.account.id);
    const mixed = loginEmail(s, { email: "alpha@solphia.io", password: "Hunter23!" });
    assert.equal(mixed.ok, false);
  });

  it("logs in with email and attaches public wallets only", () => {
    const s = blank();
    const made = createEmailAccount(s, { email: "b@solphia.io", password: "Hunter22!", tos: true, privacy: true, verified: true });
    assert.equal(made.ok, true);
    const missing = loginEmail(s, { email: "nobody@solphia.io", password: "Hunter22!" });
    assert.equal(missing.ok, false);
    if (!missing.ok) assert.equal(missing.error, "no_account");
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
    if (!noTos.ok) assert.equal(noTos.error, "no_account");
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

  it("tells sign-in when that Google has no account, and links an existing email login", () => {
    const s = blank();
    const missing = upsertGoogleAccount(s, { googleId: "g-new", email: "new@solphia.io", tos: false, privacy: false });
    assert.equal(missing.ok, false);
    if (!missing.ok) assert.equal(missing.error, "no_account");
    const email = createEmailAccount(s, {
      email: "link@solphia.io",
      password: "Hunter22!",
      tos: true,
      privacy: true,
      verified: true,
    });
    assert.equal(email.ok, true);
    const linked = upsertGoogleAccount(s, { googleId: "g-link", email: "link@solphia.io", tos: false, privacy: false });
    assert.equal(linked.ok, true);
    if (!linked.ok || !email.ok) return;
    assert.equal(linked.created, false);
    assert.equal(linked.account.id, email.account.id);
    assert.equal(linked.account.googleId, "g-link");
    const googleOnly = loginEmail(s, { email: "link@solphia.io", password: "Hunter22!" });
    assert.equal(googleOnly.ok, true);
    const gOnly = upsertGoogleAccount(s, { googleId: "g-only", email: "onlyg@solphia.io", tos: true, privacy: true });
    assert.equal(gOnly.ok, true);
    const useGoogle = loginEmail(s, { email: "onlyg@solphia.io", password: "Hunter22!" });
    assert.equal(useGoogle.ok, false);
    if (!useGoogle.ok) assert.equal(useGoogle.error, "use_google");
  });

  it("merges login rows across instances without dropping wallets", () => {
    const pk1 = "D4uCNcBKAbG9NAkmhQg7pBiztuejNzbWrZDcZmFGut81";
    const pk2 = "CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o";
    const local: LoginAccount[] = [
      {
        id: "acct_a",
        email: "a@solphia.io",
        emailNorm: "a@solphia.io",
        googleId: "g-a",
        wallets: [pk1],
        createdAt: 1,
        lastSeen: 20,
      },
    ];
    const remote: LoginAccount[] = [
      {
        id: "acct_a",
        email: "a@solphia.io",
        emailNorm: "a@solphia.io",
        googleId: "g-a",
        wallets: [pk2],
        createdAt: 1,
        lastSeen: 10,
      },
      {
        id: "acct_b",
        email: "b@solphia.io",
        emailNorm: "b@solphia.io",
        wallets: [],
        createdAt: 2,
        lastSeen: 2,
      },
    ];
    const merged = mergeLoginAccounts(local, remote);
    const a = merged.find((r) => r.id === "acct_a");
    const b = merged.find((r) => r.id === "acct_b");
    assert.ok(a);
    assert.ok(b);
    assert.equal(merged.length, 2);
    assert.equal(a!.lastSeen, 20);
    assert.ok(a!.wallets.includes(pk1));
    assert.ok(a!.wallets.includes(pk2));
  });

  it("signs an account session token", () => {
    const tok = accountToken("acctid123");
    const payload = verifyToken(tok, process.env.ADMIN_SECRET || "solphia-dev-only");
    assert.equal(payload?.startsWith("acct:acctid123:"), true);
    const ticket = signClaimTicket("acctid123");
    assert.equal(readClaimTicket(ticket), "acctid123");
    assert.equal(readClaimTicket("nope"), null);
  });

  it("copy helper is a no-op without a DOM", () => {
    assert.equal(copyText("twelve words here"), false);
  });

  it("does not advertise Phantom as a login path", () => {
    assert.equal("phantom" in WALLET_PATHS, false);
  });

  it("opens a wallet account by pubkey and restores the same account on the same seed", () => {
    const s = blank();
    const pk = "D4uCNcBKAbG9NAkmhQg7pBiztuejNzbWrZDcZmFGut81";
    const denied = openWalletAccount(s, { pubkey: pk, tos: false, privacy: false });
    assert.equal(denied.ok, false);
    const made = openWalletAccount(s, { pubkey: pk, tos: true, privacy: true });
    assert.equal(made.ok, true);
    if (!made.ok) return;
    assert.equal(made.created, true);
    assert.deepEqual(made.account.wallets, [pk]);
    const again = openWalletAccount(s, { pubkey: pk, tos: false, privacy: false });
    assert.equal(again.ok, true);
    if (!again.ok) return;
    assert.equal(again.created, false);
    assert.equal(again.account.id, made.account.id);
    const s2 = blank();
    s2.accounts = [{ id: "acct_legacy", wallets: [pk], createdAt: 1, lastSeen: 1 }];
    const blocked = openWalletAccount(s2, { pubkey: pk, tos: false, privacy: false });
    assert.equal(blocked.ok, false);
    const accepted = openWalletAccount(s2, { pubkey: pk, tos: true, privacy: true });
    assert.equal(accepted.ok, true);
    if (accepted.ok) assert.ok(accepted.account.tosAcceptedAt);
  });

  it("refuses to attach a pubkey that already belongs to another account", () => {
    const s = blank();
    const pk = "D4uCNcBKAbG9NAkmhQg7pBiztuejNzbWrZDcZmFGut81";
    const a = openWalletAccount(s, { pubkey: pk, tos: true, privacy: true });
    const otherPk = "So11111111111111111111111111111111111111112";
    const b = openWalletAccount(s, { pubkey: otherPk, tos: true, privacy: true });
    assert.equal(a.ok, true);
    assert.equal(b.ok, true);
    if (!a.ok || !b.ok) return;
    const taken = attachWallet(b.account, pk, s);
    assert.equal(taken.ok, false);
    if (!taken.ok) assert.equal(taken.error, "taken");
    assert.equal(findByWallet(s, pk)?.id, a.account.id);
  });

  it("merge keeps a leaked pubkey on the oldest account only", () => {
    const pk = "D4uCNcBKAbG9NAkmhQg7pBiztuejNzbWrZDcZmFGut81";
    const local: LoginAccount[] = [
      { id: "acct_old", wallets: [pk], createdAt: 1, lastSeen: 1 },
      { id: "acct_new", wallets: [pk], createdAt: 9, lastSeen: 9 },
    ];
    const merged = mergeLoginAccounts(local, []);
    const old = merged.find((r) => r.id === "acct_old");
    const newer = merged.find((r) => r.id === "acct_new");
    assert.ok(old);
    assert.ok(newer);
    assert.deepEqual(old!.wallets, [pk]);
    assert.deepEqual(newer!.wallets, []);
  });

  it("lets leftover unverified password accounts in and marks them verified", () => {
    const s = blank();
    const made = createEmailAccount(s, { email: "raw@solphia.io", password: "Hunter22!", tos: true, privacy: true });
    assert.equal(made.ok, true);
    if (!made.ok) return;
    assert.equal(made.account.emailVerifiedAt, undefined);
    const login = loginEmail(s, { email: "raw@solphia.io", password: "Hunter22!" });
    assert.equal(login.ok, true);
    if (!login.ok) return;
    assert.ok(login.account.emailVerifiedAt);
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

  it("accepts the math answer when Turnstile is only half-configured", async () => {
    const prevSecret = process.env.TURNSTILE_SECRET;
    const prevSite = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    process.env.TURNSTILE_SECRET = "only-secret";
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    try {
      const chal = issueChallenge();
      const payload = chal.prompt.match(/What is (\d+) \+ (\d+)\?/);
      assert.ok(payload);
      const sum = String(Number(payload![1]) + Number(payload![2]));
      const ok = await verifyBot({ challengeToken: chal.token, challengeAnswer: sum });
      assert.equal(ok.ok, true);
      const wrong = await verifyBot({ challengeToken: chal.token, challengeAnswer: "0" });
      assert.equal(wrong.ok, false);
    } finally {
      if (prevSecret === undefined) delete process.env.TURNSTILE_SECRET;
      else process.env.TURNSTILE_SECRET = prevSecret;
      if (prevSite === undefined) delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
      else process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = prevSite;
    }
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

