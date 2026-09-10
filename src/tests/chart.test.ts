import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeCandles, sparkUp, syntheticSpark } from "../lib/launch/chart";

describe("token sparks", () => {
  it("builds a 24-point green path from a positive 24h print", () => {
    const spark = syntheticSpark({ priceSol: 1.2, change24h: 0.2, change1h: 0.04, change5m: 0.01 });
    assert.equal(spark.length, 24);
    assert.ok(spark[spark.length - 1].c > spark[0].c);
    assert.equal(sparkUp(spark, 0), true);
  });

  it("sorts and clamps candle wicks", () => {
    const rows = normalizeCandles([
      { t: 2, o: 2, h: 1, l: 3, c: 2.2 },
      { t: 1, o: 1, h: 1.5, l: 0.5, c: 1.2 },
    ]);
    assert.equal(rows[0].t, 1);
    assert.ok(rows[1].h >= rows[1].c);
    assert.ok(rows[1].l <= rows[1].o);
  });
});
