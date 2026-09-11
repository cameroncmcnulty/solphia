import type { XStockId, XStockSymbol } from "./mints";
import { XSTOCKS } from "./mints";

export type Sleeve = "SOL" | "USDC" | XStockSymbol;

export type TradePair = {
  id: string;
  left: Sleeve;
  right: Sleeve;
  leftName: string;
  rightName: string;
};

/** Equal sleeves so she can fire whichever pair stretches. PnL home is USDC. */
export const SLEEVE_WEIGHT = 0.46;
export const SLEEVES: Sleeve[] = ["USDC", "SOL", "SPYx", "QQQx", "GLDx"];

export const TRADE_PAIRS: TradePair[] = [
  { id: "sol-usdc", left: "SOL", right: "USDC", leftName: "SOL", rightName: "USDC" },
  { id: "sol-spyx", left: "SOL", right: "SPYx", leftName: "SOL", rightName: "S&P 500" },
  { id: "sol-qqqx", left: "SOL", right: "QQQx", leftName: "SOL", rightName: "Nasdaq-100" },
  { id: "sol-gldx", left: "SOL", right: "GLDx", leftName: "SOL", rightName: "gold" },
  { id: "usdc-spyx", left: "USDC", right: "SPYx", leftName: "USDC", rightName: "S&P 500" },
  { id: "usdc-qqqx", left: "USDC", right: "QQQx", leftName: "USDC", rightName: "Nasdaq-100" },
  { id: "usdc-gldx", left: "USDC", right: "GLDx", leftName: "USDC", rightName: "gold" },
  { id: "spyx-qqqx", left: "SPYx", right: "QQQx", leftName: "S&P 500", rightName: "Nasdaq-100" },
  { id: "spyx-gldx", left: "SPYx", right: "GLDx", leftName: "S&P 500", rightName: "gold" },
  { id: "qqqx-gldx", left: "QQQx", right: "GLDx", leftName: "Nasdaq-100", rightName: "gold" },
];

const NAMES: Record<Sleeve, string> = {
  SOL: "SOL",
  USDC: "USDC",
  SPYx: "S&P 500",
  QQQx: "Nasdaq-100",
  GLDx: "gold",
};

export function sleeveName(s: Sleeve): string {
  return NAMES[s];
}

export function involvesEquity(pair: TradePair): boolean {
  return pair.left === "SPYx" || pair.right === "SPYx" || pair.left === "QQQx" || pair.right === "QQQx";
}

export function involvesSol(pair: TradePair): boolean {
  return pair.left === "SOL" || pair.right === "SOL";
}

export function xstockIdOf(sleeve: Sleeve): XStockId | null {
  const row = XSTOCKS.find((x) => x.symbol === sleeve);
  return row ? row.id : null;
}
