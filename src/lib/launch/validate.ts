import { DEV_BUY_MAX_SOL } from "./curve";
import { socialHref } from "./links";

export function walletOk(s: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);
}

/** Data-URL cap. JPEG is compressed to fit before upload. */
export const IMAGE_DATA_MAX = 140_000;

export type LaunchField =
  | "wallet"
  | "image"
  | "name"
  | "symbol"
  | "blurb"
  | "website"
  | "x"
  | "telegram"
  | "discord"
  | "launchBuySol";

export type LaunchCreateInput = {
  creator?: string;
  name?: string;
  symbol?: string;
  blurb?: string;
  image?: string;
  website?: string;
  x?: string;
  telegram?: string;
  discord?: string;
  launchBuySol?: number;
};

export function tickerOk(s: string): boolean {
  return /^[A-Z0-9]{2,10}$/.test(s.trim().toUpperCase());
}

export function nameOk(s: string): boolean {
  const t = s.trim();
  return t.length >= 2 && t.length <= 24;
}

export function imageOk(raw?: string): string {
  const s = (raw || "").trim();
  if (!s) return "";
  if (!/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(s)) return "";
  if (s.length > IMAGE_DATA_MAX) return "";
  return s;
}

export function validateLaunchCreate(input: LaunchCreateInput): Partial<Record<LaunchField, string>> {
  const errors: Partial<Record<LaunchField, string>> = {};
  if (!input.creator || !walletOk(input.creator)) {
    errors.wallet = "Connect Phantom to launch.";
  }
  const name = (input.name || "").trim();
  if (!name) errors.name = "Add a name (2–24 characters).";
  else if (!nameOk(name)) errors.name = "Name must be 2–24 characters.";

  const symbol = (input.symbol || "").replace(/^\$+/, "").trim().toUpperCase();
  if (!symbol) errors.symbol = "Add a ticker (2–10 letters or numbers).";
  else if (!tickerOk(symbol)) errors.symbol = "Ticker must be 2–10 letters or numbers. No spaces or symbols.";

  if ((input.blurb || "").length > 280) errors.blurb = "Keep the one-liner under 280 characters.";

  if (input.image) {
    if (!imageOk(input.image)) {
      errors.image = input.image.startsWith("data:image")
        ? "Image is too heavy. Try a simpler square PNG or JPEG."
        : "Use a PNG, JPEG, or WebP. We crop a square.";
    }
  }

  if ((input.website || "").trim() && !socialHref("website", input.website)) {
    errors.website = "That website does not look like a valid URL.";
  }
  if ((input.x || "").trim() && !socialHref("x", input.x)) {
    errors.x = "Use an X handle or x.com/… link.";
  }
  if ((input.telegram || "").trim() && !socialHref("telegram", input.telegram)) {
    errors.telegram = "Use a Telegram handle or t.me/… link.";
  }
  if ((input.discord || "").trim() && !socialHref("discord", input.discord)) {
    errors.discord = "Use a discord.gg invite.";
  }

  const buy = Number(input.launchBuySol) || 0;
  if (buy < 0) errors.launchBuySol = "Dev buy cannot be negative.";
  else if (buy > DEV_BUY_MAX_SOL) errors.launchBuySol = `Dev buy at launch is capped at ${DEV_BUY_MAX_SOL} SOL.`;
  return errors;
}

export function firstError<K extends string>(errors: Partial<Record<K, string>>): string {
  return (Object.values(errors).find((v) => typeof v === "string" && v) as string | undefined) || "";
}

export function firstErrorKey<K extends string>(errors: Partial<Record<K, string>>): K | undefined {
  return (Object.keys(errors) as K[]).find((k) => errors[k]);
}

export function launchCodeToField(code?: string): LaunchField | "form" {
  if (code === "bad_wallet") return "wallet";
  if (code === "bad_name") return "name";
  if (code === "bad_ticker" || code === "ticker_taken") return "symbol";
  if (code === "bad_image") return "image";
  if (code === "dev_buy_cap") return "launchBuySol";
  if (code === "bad_link") return "website";
  return "form";
}
