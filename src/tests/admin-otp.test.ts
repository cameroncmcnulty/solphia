import assert from "node:assert/strict";
import { describe, it } from "node:test";
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
});

describe("mailer", () => {
  it("is off without credentials", () => {
    const prev = {
      host: process.env.SMTP_HOST,
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_APP_PASSWORD,
      smtpUser: process.env.SMTP_USER,
      smtpPass: process.env.SMTP_PASS,
      resend: process.env.RESEND_API_KEY,
    };
    delete process.env.SMTP_HOST;
    delete process.env.MAIL_USER;
    delete process.env.MAIL_APP_PASSWORD;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.RESEND_API_KEY;
    assert.equal(mailerKind(), null);
    assert.equal(mailConfigured(), false);
    if (prev.host) process.env.SMTP_HOST = prev.host;
    if (prev.user) process.env.MAIL_USER = prev.user;
    if (prev.pass) process.env.MAIL_APP_PASSWORD = prev.pass;
    if (prev.smtpUser) process.env.SMTP_USER = prev.smtpUser;
    if (prev.smtpPass) process.env.SMTP_PASS = prev.smtpPass;
    if (prev.resend) process.env.RESEND_API_KEY = prev.resend;
  });

  it("picks gmail when user+app password are set without a host", () => {
    const prevHost = process.env.SMTP_HOST;
    const prevUser = process.env.MAIL_USER;
    const prevPass = process.env.MAIL_APP_PASSWORD;
    delete process.env.SMTP_HOST;
    process.env.MAIL_USER = "hello@gmail.com";
    process.env.MAIL_APP_PASSWORD = "abcd efgh ijkl mnop";
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.RESEND_API_KEY;
    assert.equal(mailerKind(), "gmail");
    if (prevHost) process.env.SMTP_HOST = prevHost;
    else delete process.env.SMTP_HOST;
    if (prevUser) process.env.MAIL_USER = prevUser;
    else delete process.env.MAIL_USER;
    if (prevPass) process.env.MAIL_APP_PASSWORD = prevPass;
    else delete process.env.MAIL_APP_PASSWORD;
  });
});
