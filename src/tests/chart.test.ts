import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { axisTicks, bucketCandles, fmtAxisPx, normalizeCandles, scaleSpark, smoothSpark, sparkUp, syntheticSpark } from "../lib/launch/chart";
import { rewriteImageUrl } from "../components/TokenArt";

describe("token sparks", () => {
  it("builds a 5-print path from windowed % so each coin is not the same sine wave", () => {
    const spark = syntheticSpark({ priceSol: 1.2, change24h: 0.2, change1h: 0.04, change5m: 0.01 });
    assert.equal(spark.length, 5);
    assert.ok(spark[spark.length - 1].c > spark[0].c);
    assert.equal(sparkUp(spark, 0), true);
  });

  it("smooths those prints into a unique curve, not a copied sine", () => {
    const a = smoothSpark({ priceSol: 1, change24h: 0.4, change1h: -0.05, change5m: 0.02 });
    const b = smoothSpark({ priceSol: 1, change24h: -0.3, change1h: 0.1, change5m: -0.02 });
    assert.equal(a.length, 32);
    assert.ok(a[a.length - 1].c > a[0].c);
    assert.ok(b[b.length - 1].c < b[0].c);
    assert.notEqual(a.map((p) => p.c.toFixed(4)).join(), b.map((p) => p.c.toFixed(4)).join());
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

  it("buckets a long tape into fewer candles without dropping the last close", () => {
    const long = Array.from({ length: 80 }, (_, i) => ({ t: i + 1, o: i, h: i + 1, l: i, c: i + 0.5 }));
    const b = bucketCandles(long, 10);
    assert.ok(b.length <= 10);
    assert.equal(b[b.length - 1].c, long[long.length - 1].c);
  });

  it("scales SOL candles into USD without changing time", () => {
    const rows = scaleSpark(
      [
        { t: 1, o: 0.01, h: 0.02, l: 0.009, c: 0.015 },
        { t: 2, o: 0.015, h: 0.03, l: 0.01, c: 0.02 },
      ],
      100,
    );
    assert.equal(rows[1].t, 2);
    assert.equal(rows[1].c, 2);
    assert.ok(rows[0].h > rows[0].c);
  });

  it("places axis ticks on the same min/max the candles use", () => {
    const ticks = axisTicks(0.8, 1.2, 4);
    assert.equal(ticks.length, 4);
    assert.equal(ticks[0], 1.2);
    assert.equal(ticks[ticks.length - 1], 0.8);
    assert.ok(fmtAxisPx(0.00042).startsWith("0.000"));
  });
});

describe("token art urls", () => {
  it("leaves https and data urls alone and lifts ipfs onto a gateway", () => {
    assert.equal(rewriteImageUrl("https://dd.dexscreener.com/x.png"), "https://dd.dexscreener.com/x.png");
    assert.equal(rewriteImageUrl("data:image/png;base64,abc"), "data:image/png;base64,abc");
    assert.equal(
      rewriteImageUrl("ipfs://QmHashHereThatIsLongEnoughToPassTheCidCheckXX"),
      "https://pump.mypinata.cloud/ipfs/QmHashHereThatIsLongEnoughToPassTheCidCheckXX",
    );
    assert.equal(
      rewriteImageUrl("https://ipfs.io/ipfs/bafybeibi5456odfpboswifv75btyarpbh3qpvjtai5q4k6r737jpmaczuu"),
      "https://pump.mypinata.cloud/ipfs/bafybeibi5456odfpboswifv75btyarpbh3qpvjtai5q4k6r737jpmaczuu",
    );
  });
});
