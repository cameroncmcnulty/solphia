import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { consumeAdminOtp, DEFAULT_ADMIN_OTP_EMAIL, maskEmail, startAdminOtp } from "../lib/admin/otp";
import { hashOtp, otpMatch } from "../lib/auth/otp";
import { emptyState } from "../lib/store";
import { mailerKind, mailConfigured } from "../lib/email/send";

describe("admin otp", () => {
  it("defaults to CameronCmcnulty@gmail.com and hashes the code", () => {
    const s = emptyState();
    const started = startAdminOtp(s);
    assert.equal(started.ok, true);
    if (!started.ok) return;
    assert.equal(started.email, DEFAULT_ADMIN_OTP_EMAIL.toLowerCase());
    assert.ok(s.adminOtpPending);
    assert.equal(s.adminOtpPending?.otpHash, hashOtp(started.email, started.otp));
    assert.equal(otpMatch(started.email, started.otp, s.adminOtpPending!.otpHash), true);
    const bad = consumeAdminOtp(s, "000000");
    assert.equal(bad.ok, false);
    const ok = consumeAdminOtp(s, started.otp);
    assert.equal(ok.ok, true);
    assert.equal(s.adminOtpPending, null);
  });

  it("masks the inbox", () => {
    assert.equal(maskEmail("CameronCmcnulty@gmail.com").includes("gmail.com"), true);
    assert.equal(maskEmail("CameronCmcnulty@gmail.com").includes("Cameron"), false);
  });

  it("uses an editable admin inbox", () => {
    const s = emptyState();
    s.adminOtpEmail = "ops@solphia.io";
    const started = startAdminOtp(s);
    assert.equal(started.ok, true);
    if (!started.ok) return;
    assert.equal(started.email, "ops@solphia.io");
  });

  it("accepts a pasted code with spaces and keeps the digits readable in mail", () => {
    const s = emptyState();
    const started = startAdminOtp(s);
    assert.equal(started.ok, true);
    if (!started.ok) return;
    const spaced = started.otp.split("").join(" ");
    assert.equal(consumeAdminOtp(s, spaced).ok, true);
    const html = readFileSync(join(process.cwd(), "src/lib/admin/otp.ts"), "utf8");
    assert.match(html, /background:#ffffff/);
    assert.match(html, /Dashboard one-time code/);
  });

  it("writes the admin code to its own durable key so verify can run on another instance", () => {
    const persist = readFileSync(join(process.cwd(), "src/lib/persist.ts"), "utf8");
    const login = readFileSync(join(process.cwd(), "src/app/api/admin/login/route.ts"), "utf8");
    const otp = readFileSync(join(process.cwd(), "src/lib/auth/otp.ts"), "utf8");
    assert.match(persist, /adminOtp:\s*"solphia:admin-otp"/);
    assert.match(login, /await pullAdminOtp\(s\)/);
    assert.match(login, /await saveAdminOtp\(/);
    assert.match(otp, /function otpSecret\(\)/);
  });
});

describe("mailer", () => {
  function snapMailEnv() {
    return {
      host: process.env.SMTP_HOST,
      smtpUser: process.env.SMTP_USER,
      smtpPass: process.env.SMTP_PASS,
      resend: process.env.RESEND_API_KEY,
      agent: process.env.AGENTMAIL_API_KEY,
      inbox: process.env.AGENTMAIL_INBOX,
      mailUser: process.env.MAIL_USER,
      mailPass: process.env.MAIL_APP_PASSWORD,
    };
  }
  function restoreMailEnv(prev: ReturnType<typeof snapMailEnv>) {
    const put = (k: string, v: string | undefined) => {
      if (v) process.env[k] = v;
      else delete process.env[k];
    };
    put("SMTP_HOST", prev.host);
    put("SMTP_USER", prev.smtpUser);
    put("SMTP_PASS", prev.smtpPass);
    put("RESEND_API_KEY", prev.resend);
    put("AGENTMAIL_API_KEY", prev.agent);
    put("AGENTMAIL_INBOX", prev.inbox);
    put("MAIL_USER", prev.mailUser);
    put("MAIL_APP_PASSWORD", prev.mailPass);
  }

  it("is off without credentials", () => {
    const prev = snapMailEnv();
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.RESEND_API_KEY;
    delete process.env.AGENTMAIL_API_KEY;
    delete process.env.MAIL_USER;
    delete process.env.MAIL_APP_PASSWORD;
    assert.equal(mailerKind(), null);
    assert.equal(mailConfigured(), false);
    restoreMailEnv(prev);
  });

  it("picks AgentMail and ignores a Gmail app password", () => {
    const prev = snapMailEnv();
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.RESEND_API_KEY;
    process.env.MAIL_USER = "hello@gmail.com";
    process.env.MAIL_APP_PASSWORD = "abcd efgh ijkl mnop";
    process.env.AGENTMAIL_API_KEY = "am_test";
    process.env.AGENTMAIL_INBOX = "solphia@agentmail.to";
    assert.equal(mailerKind(), "agentmail");
    delete process.env.AGENTMAIL_API_KEY;
    assert.equal(mailerKind(), null);
    restoreMailEnv(prev);
  });

  it("does not tell operators to use a Gmail app password", () => {
    const login = readFileSync(join(process.cwd(), "src/app/api/admin/login/route.ts"), "utf8");
    const otp = readFileSync(join(process.cwd(), "src/app/api/auth/otp/route.ts"), "utf8");
    const send = readFileSync(join(process.cwd(), "src/lib/email/send.ts"), "utf8");
    assert.equal(login.includes("MAIL_APP_PASSWORD"), false);
    assert.equal(otp.includes("MAIL_APP_PASSWORD"), false);
    assert.equal(send.includes("smtp.gmail.com"), false);
    assert.match(send, /agentmail\.to/);
  });
});
