import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { clampSlide, HUMAN_KEY, makePuzzle, PIECE_BOX, PUZZLE_W, puzzleHit } from "../lib/human/puzzle";

describe("human puzzle", () => {
  it("same seed always lands the piece in the same slot", () => {
    const a = makePuzzle("solphia-cartoon-1");
    const b = makePuzzle("solphia-cartoon-1");
    assert.equal(a.targetX, b.targetX);
    assert.equal(a.targetY, b.targetY);
    assert.ok(a.targetX >= 18);
    assert.ok(a.targetX <= PUZZLE_W - PIECE_BOX - 18);
  });

  it("accepts a slide that fits and rejects one that does not", () => {
    const p = makePuzzle("fit-check");
    assert.equal(puzzleHit(p.targetX, p.targetX), true);
    assert.equal(puzzleHit(p.targetX + 4, p.targetX), true);
    assert.equal(puzzleHit(p.targetX + 16, p.targetX), true);
    assert.equal(puzzleHit(p.targetX + 28, p.targetX), false);
    assert.equal(puzzleHit(0, p.targetX), false);
  });

  it("keeps the slider on the board", () => {
    assert.equal(clampSlide(-40), 0);
    assert.equal(clampSlide(PUZZLE_W), PUZZLE_W - PIECE_BOX);
    assert.equal(clampSlide(40), 40);
  });

  it("is a Shill Zone entry slider, not a site-wide cookie", () => {
    assert.equal(HUMAN_KEY, "solphia_human");
    const shell = readFileSync(join(process.cwd(), "src/components/Shell.tsx"), "utf8");
    const shill = readFileSync(join(process.cwd(), "src/app/shill/page.tsx"), "utf8");
    const gate = readFileSync(join(process.cwd(), "src/components/HumanGate.tsx"), "utf8");
    const house = readFileSync(join(process.cwd(), "src/lib/shill/house.ts"), "utf8");
    assert.equal(shell.includes("<HumanGate"), false);
    assert.match(shill, /<HumanGate/);
    assert.match(shill, /everyVisit/);
    assert.match(gate, /Enter Shill Zone/);
    assert.equal(gate.includes("markHuman()"), false);
    assert.equal(house.includes("shillWalletAllowed"), false);
    assert.equal(house.includes("guestBlock"), false);
  });

  it("rolls a different cartoon slot for a different seed", () => {
    const a = makePuzzle("alpha");
    const b = makePuzzle("beta");
    assert.ok(a.targetX !== b.targetX || a.targetY !== b.targetY);
  });
});
