import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  backupIndex,
  beginTotp,
  confirmTotp,
  decodeBase32,
  disableTotp,
  encodeBase32,
  hashBackupCode,
  makeBackupCodes,
  totpAuthUrl,
  totpCodeAt,
  totpEnabled,
  totpMatch,
  unsealTotpSecret,
  verifyTotp,
  type TotpSlot,
} from "../lib/auth/totp";
import { createEmailAccount, loginEmail, publicAccount } from "../lib/auth/accounts";
import { emptyState } from "../lib/store";

describe("totp", () => {
  it("matches the RFC 6238 SHA1 6-digit vector at T=59", () => {
    const secret = encodeBase32(Buffer.from("12345678901234567890"));
    assert.equal(decodeBase32(secret).equals(Buffer.from("12345678901234567890")), true);
    assert.equal(totpCodeAt(secret, 1), "287082");
    assert.equal(totpMatch(secret, "287082", 59_000).ok, true);
    assert.equal(totpMatch(secret, "000000", 59_000).ok, false);
  });

  it("enrolls, verifies, consumes a backup code once, and refuses a replayed totp", () => {
    const slot: TotpSlot = {};
    const started = beginTotp(slot, "you@solphia.io");
    assert.equal(started.backupCodes.length, 8);
    assert.match(started.otpauth, /^otpauth:\/\/totp\/Solphia/);
    assert.equal(totpEnabled(slot), false);
    const now = Date.now();
    const code = totpCodeAt(started.secret, Math.floor(now / 30_000));
    assert.equal(confirmTotp(slot, code, now).ok, true);
    assert.equal(totpEnabled(slot), true);
    const again = totpCodeAt(unsealTotpSecret(slot.totpSecret!), Math.floor(now / 30_000));
    assert.equal(verifyTotp(slot, again, now).ok, false);
    const backup = started.backupCodes[0]!;
    const used = verifyTotp(slot, backup, now + 60_000);
    assert.equal(used.ok, true);
    if (used.ok) assert.equal(used.via, "backup");
    assert.equal(verifyTotp(slot, backup, now + 90_000).ok, false);
    assert.equal(backupIndex(slot.totpBackupHashes, backup), -1);
    assert.equal(hashBackupCode(backup).length, 64);
  });

  it("turns 2FA off only with a live code and never leaks the secret on the public account", () => {
    const s = emptyState();
    const made = createEmailAccount(s, {
      email: "two@solphia.io",
      password: "Hunter22!",
      tos: true,
      privacy: true,
      verified: true,
    });
    assert.equal(made.ok, true);
    if (!made.ok) return;
    const started = beginTotp(made.account, "two@solphia.io");
    const now = Date.now();
    const code = totpCodeAt(started.secret, Math.floor(now / 30_000));
    assert.equal(confirmTotp(made.account, code, now).ok, true);
    const pub = publicAccount(made.account);
    assert.equal(pub.totpEnabled, true);
    const dump = JSON.stringify(pub).toLowerCase();
    assert.equal(dump.includes("totpsecret"), false);
    assert.equal(dump.includes(started.secret.toLowerCase()), false);
    const later = now + 45_000;
    const next = totpCodeAt(started.secret, Math.floor(later / 30_000));
    assert.equal(disableTotp(made.account, next, later).ok, true);
    assert.equal(totpEnabled(made.account), false);
    const login = loginEmail(s, { email: "two@solphia.io", password: "Hunter22!" });
    assert.equal(login.ok, true);
  });

  it("issues 8 dashed backup codes and a Solphia otpauth URL", () => {
    const codes = makeBackupCodes();
    assert.equal(codes.length, 8);
    for (const c of codes) assert.match(c, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    assert.match(totpAuthUrl({ label: "admin", secret: "MFRGGZDF" }), /issuer=Solphia/);
    const ui = readFileSync(join(process.cwd(), "src/components/auth/TotpSetup.tsx"), "utf8");
    assert.match(ui, /one-time keys/);
    assert.match(ui, /will not show them again/);
    assert.match(ui, /only way back in/);
    const login = readFileSync(join(process.cwd(), "src/app/api/admin/login/route.ts"), "utf8");
    assert.equal(login.includes("queueEmail"), false);
    assert.match(login, /beginTotp/);
    const gate = readFileSync(join(process.cwd(), "src/components/auth/AccountGate.tsx"), "utf8");
    assert.match(gate, /totp-opt/);
    assert.match(gate, /Turn on Google Authenticator/);
    const host = readFileSync(join(process.cwd(), "src/components/wallet/WalletHost.tsx"), "utf8");
    assert.match(host, /auth_2fa/);
    const account = readFileSync(join(process.cwd(), "src/app/account/page.tsx"), "utf8");
    assert.match(account, /TotpSettings/);
    assert.match(account, /Two-factor auth/);
    const system = readFileSync(join(process.cwd(), "src/components/admin/sections/System.tsx"), "utf8");
    assert.match(system, /Google Authenticator/);
    assert.equal(system.includes("Every dashboard sign-in emails"), false);
    const google = readFileSync(join(process.cwd(), "src/app/api/auth/google/callback/route.ts"), "utf8");
    assert.match(google, /auth_2fa=1/);
    assert.match(google, /clearAccountCookie/);
  });
});
