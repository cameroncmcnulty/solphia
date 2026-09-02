import type { TokenSnapshot } from "../types";

export const PUMP_GRAD_SOL = 85;

export type GradRead = {
  p: number;
  solInCurve: number;
  solPerUnique: number;
  botShare: number;
  social: boolean;
  telegram: boolean;
  twitter: boolean;
  ageMin: number;
  unique: number;
  why: string;
};

function sigmoid(x: number) {
  if (x > 16) return 1;
  if (x < -16) return 0;
  return 1 / (1 + Math.exp(-x));
}

function tanh01(x: number) {
  const e = Math.exp(-2 * Math.max(-20, Math.min(20, x)));
  return (1 - e) / (1 + e);
}

export function hasTelegram(s?: string): boolean {
  if (!s) return false;
  return /t\.me\/[A-Za-z0-9_]+/i.test(s);
}

export function hasTwitter(s?: string): boolean {
  if (!s) return false;
  return /(?:twitter\.com|x\.com)\/[A-Za-z0-9_]+/i.test(s) || /^@[A-Za-z0-9_]{3,15}$/.test(s);
}

export function graduationRead(token: TokenSnapshot, now = Date.now()): GradRead {
  const ageMin = Math.max(0, (now - (token.createdAt || now)) / 60000);
  const unique = Math.max(0, token.uniqueTraders1h || 0);
  const botShare = token.bundleRatio ?? (token.organicBuyRatio != null ? 1 - token.organicBuyRatio : 0.35);
  const telegram = hasTelegram(token.socials?.telegram);
  const twitter = hasTwitter(token.socials?.twitter);
  const website = Boolean(token.socials?.website && /^https?:\/\//i.test(token.socials.website));
  const social = telegram || twitter || website;
  const death = token.deployerDeathRate ?? 0.45;
  const fill = token.graduated ? 1 : Math.max(0, Math.min(1, token.bondingProgress || 0));
  const solInCurve = fill * PUMP_GRAD_SOL;
  const solPerUnique = unique > 0 ? solInCurve / unique : 0;
  const txns = token.txns1h || token.buys1h + token.sells1h;
  const churn = unique > 0 ? txns / unique : 0;

  let z = -3.15;
  z += 4.15 * fill;
  z += 1.85 * tanh01(solPerUnique / 0.45);
  z -= 2.55 * Math.max(0, Math.min(1, botShare));
  z -= 1.7 * Math.max(0, Math.min(1, death));
  z += telegram ? 0.85 : 0;
  z += twitter ? 0.35 : 0;
  z += website ? 0.12 : 0;
  z += 0.55 * tanh01(unique / 70);
  z -= 1.15 * Math.max(0, ageMin - 22) / 45;
  if (token.uniqueEstimated) z -= 0.45;
  if (churn > 10) z -= 0.7;
  if (token.livestream) z -= 0.8;
  if (token.banned || token.nsfw) z -= 4;

  const p = Math.round(sigmoid(z) * 1000) / 1000;
  const why =
    fill >= 0.88
      ? `Curve ${Math.round(fill * 100)}% · P(grad) ${(p * 100).toFixed(0)}%`
      : solPerUnique >= 0.35 && botShare < 0.25
        ? `Real SOL per buyer · P(grad) ${(p * 100).toFixed(0)}%`
        : botShare >= 0.4
          ? `Bot-heavy flow · P(grad) ${(p * 100).toFixed(0)}%`
          : telegram
            ? `Telegram on the page · P(grad) ${(p * 100).toFixed(0)}%`
            : `P(grad) ${(p * 100).toFixed(0)}% · ${Math.round(solInCurve)} SOL in curve`;

  return { p, solInCurve, solPerUnique, botShare, social, telegram, twitter, ageMin, unique, why };
}

export function armLaunch(read: GradRead, minP = 0.48): boolean {
  return read.p >= minP && read.ageMin >= 3 && read.botShare < 0.28 && (read.unique >= 35 || read.telegram);
}

export function armMigrate(read: GradRead, fill: number, minP = 0.55): boolean {
  return read.p >= minP || fill >= 0.88;
}
