import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SHILL_IP_WALLET_MAX, shillWalletAllowed } from "../lib/shill/antispam";
import { houseActorPubkey } from "../lib/shill/house";

const A = "CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o";
const B = "D4uCNcBKAbG9NAkmhQg7pBiztuejNzbWrZDcZmFGut81";
const C = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
const D = "2jNYVsfptvRLrg8V8AoLMVq6pnmpi7BHVo7Hsx5PTpma";

describe("shill antispam", () => {
  it("lets the same wallet return and blocks a 4th new wallet from one IP", () => {
    const ip = "203.0.113." + Math.floor(Math.random() * 200);
    const dev = "dev-" + Math.random().toString(36).slice(2);
    assert.equal(shillWalletAllowed(ip, dev, A).ok, true);
    assert.equal(shillWalletAllowed(ip, dev, A).ok, true);
    assert.equal(shillWalletAllowed(ip, dev, B).ok, true);
    assert.equal(shillWalletAllowed(ip, dev, C).ok, true);
    const fourth = shillWalletAllowed(ip, dev, D);
    assert.equal(fourth.ok, false);
    if (!fourth.ok) assert.equal(fourth.error, "wallet_flood");
    assert.equal(shillWalletAllowed(ip, dev, A).ok, true);
    assert.equal(SHILL_IP_WALLET_MAX, 3);
  });

  it("does not run inside house ticks so room wallets keep posting", () => {
    const house = readFileSync(join(process.cwd(), "src/lib/shill/house.ts"), "utf8");
    const route = readFileSync(join(process.cwd(), "src/app/api/shill/route.ts"), "utf8");
    assert.equal(house.includes("from \"./antispam\""), false);
    assert.equal(house.includes("shillWalletAllowed"), false);
    assert.match(route, /guestBlock/);
    assert.match(route, /action === "human"/);
    assert.equal(houseActorPubkey(0).length > 30, true);
  });
});
