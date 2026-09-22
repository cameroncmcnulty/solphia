import { DEV_BUY_MAX_SOL } from "./curve";
import { socialHref } from "./links";

export function walletOk(s: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);
}

/** Data-URL cap. 512×512 PNG/JPEG for wallets; also used for profile art. */
export const IMAGE_DATA_MAX = 360_000;

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

export const NAME_MIN = 2;
export const NAME_MAX = 24;
export const TICKER_MIN = 2;
export const TICKER_MAX = 10;

export function tickerOk(s: string): boolean {
  return new RegExp(`^[A-Z0-9]{${TICKER_MIN},${TICKER_MAX}}$`).test(s.trim().toUpperCase());
}

export function nameOk(s: string): boolean {
  const t = s.trim();
  return t.length >= NAME_MIN && t.length <= NAME_MAX;
}

export function imageOk(raw?: string): string {
  const s = (raw || "").trim();
  if (!s) return "";
  if (!/^data:image\/(png|jpeg|jpg|webp|gif|bmp|heic|heif|avif|tiff|tif);base64,/i.test(s)) return "";
  if (s.length > IMAGE_DATA_MAX) return "";
  return s;
}

function trustedImageHost(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h === "solphia.io" ||
    h.endsWith(".solphia.io") ||
    h.endsWith(".pinata.cloud") ||
    h.endsWith(".mypinata.cloud") ||
    h === "ipfs.io" ||
    h.endsWith(".ipfs.io") ||
    h.endsWith(".nftstorage.link") ||
    h.endsWith(".arweave.net") ||
    h === "arweave.net"
  );
}

/** Data-URL upload or a public https image already pinned to IPFS. */
export function storedImage(raw?: string): string {
  const data = imageOk(raw);
  if (data) return data;
  const s = (raw || "").trim();
  if (!/^https:\/\//i.test(s) || s.length > 512) return "";
  try {
    if (trustedImageHost(new URL(s).hostname)) return s;
  } catch {
    return "";
  }
  return "";
}

export function validateLaunchCreate(input: LaunchCreateInput): Partial<Record<LaunchField, string>> {
  const errors: Partial<Record<LaunchField, string>> = {};
  if (!input.creator || !walletOk(input.creator)) {
    errors.wallet = "Connect your wallet to launch.";
  }
  const name = (input.name || "").trim();
  if (!name) errors.name = `Add a name (${NAME_MIN}–${NAME_MAX} characters).`;
  else if (name.length < NAME_MIN) errors.name = `Name is too short. Use at least ${NAME_MIN} characters (you entered ${name.length}).`;
  else if (name.length > NAME_MAX) errors.name = `Name is too long. Max ${NAME_MAX} characters (you entered ${name.length}).`;
  else if (!nameOk(name)) errors.name = `Name must be ${NAME_MIN}–${NAME_MAX} characters.`;

  const symbol = (input.symbol || "").replace(/^\$+/, "").trim().toUpperCase();
  if (!symbol) errors.symbol = `Add a ticker (${TICKER_MIN}–${TICKER_MAX} letters or numbers).`;
  else if (symbol.length < TICKER_MIN) errors.symbol = `Ticker is too short. Use at least ${TICKER_MIN} letters or numbers (you entered ${symbol.length}).`;
  else if (symbol.length > TICKER_MAX) errors.symbol = `Ticker is too long. Max ${TICKER_MAX} letters or numbers.`;
  else if (!tickerOk(symbol)) errors.symbol = `Ticker must be ${TICKER_MIN}–${TICKER_MAX} letters or numbers. No spaces or symbols.`;

  if ((input.blurb || "").length > 280) errors.blurb = "Keep the one-liner under 280 characters.";

  if (input.image) {
    if (!storedImage(input.image)) {
      errors.image = input.image.startsWith("data:image")
        ? "Image is too heavy. Try a simpler photo."
        : "Use a photo from your camera roll. We crop a 512×512 square.";
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
  if (code === "bad_image" || code === "pin_failed") return "image";
  if (code === "dev_buy_cap") return "launchBuySol";
  if (code === "bad_link") return "website";
  return "form";
}
