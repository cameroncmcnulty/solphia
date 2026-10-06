import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { isProjectProtocolWallet } from "../lib/projectDest";
import { treasuryAddress } from "../lib/treasury";
import { ownerAddress } from "../lib/ownerWallet";

describe("project protocol wallets", () => {
  it("treats the saved treasury and owner as protocol wallets", () => {
    assert.equal(isProjectProtocolWallet(treasuryAddress()), true);
    assert.equal(isProjectProtocolWallet(ownerAddress()), true);
    assert.equal(isProjectProtocolWallet("CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o"), false);
    assert.equal(isProjectProtocolWallet(""), false);
  });

  it("skips the house 1% when the swap owner is a project wallet", () => {
    const src = readFileSync(path.join(process.cwd(), "src/app/api/swap/build/route.ts"), "utf8");
    assert.match(src, /isProjectProtocolWallet/);
    assert.match(src, /skipHouse/);
    const open = readFileSync(path.join(process.cwd(), "src/lib/swap/open.ts"), "utf8");
    assert.match(open, /skipHouse/);
    const wallets = readFileSync(path.join(process.cwd(), "src/components/admin/sections/Wallets.tsx"), "utf8");
    assert.match(wallets, /\/api\/admin\/claim/);
    assert.match(wallets, /signAndSendProjectTx/);
  });
});
