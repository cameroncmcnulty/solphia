import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  TOKEN_ART_MAX_ZOOM,
  clamp,
  coverCrop,
  cropAt,
  cropStageStyle,
  panCrop,
  zoomCrop,
  zoomOf,
} from "../lib/launch/tokenImage";

describe("token art crop", () => {
  it("cover-crops a landscape photo to a centered square", () => {
    const r = coverCrop(2000, 1000);
    assert.equal(r.size, 1000);
    assert.equal(r.x, 500);
    assert.equal(r.y, 0);
  });

  it("cover-crops a portrait photo to a centered square", () => {
    const r = coverCrop(800, 1600);
    assert.equal(r.size, 800);
    assert.equal(r.x, 0);
    assert.equal(r.y, 400);
  });

  it("leaves an already-square image as the full frame", () => {
    const r = coverCrop(512, 512);
    assert.deepEqual(r, { x: 0, y: 0, size: 512 });
  });

  it("zoom tightens around the current center and stays in bounds", () => {
    const r = zoomCrop(coverCrop(2000, 1000), 2000, 1000, 2);
    assert.equal(r.size, 500);
    assert.equal(r.x, 750);
    assert.equal(r.y, 250);
    const tight = cropAt(2000, 1000, 99, 0, 0);
    assert.ok(tight.x >= 0);
    assert.ok(tight.y >= 0);
    assert.ok(tight.x + tight.size <= 2000);
    assert.ok(tight.y + tight.size <= 1000);
    assert.equal(zoomOf(tight, 2000, 1000), TOKEN_ART_MAX_ZOOM);
  });

  it("pan cannot leave the image", () => {
    const r = panCrop(coverCrop(2000, 1000), 2000, 1000, -10_000, 10_000);
    assert.equal(r.x, 0);
    assert.equal(r.y, 0);
    assert.equal(r.size, 1000);
  });

  it("maps the crop onto a square stage without stretching", () => {
    const r = coverCrop(2000, 1000);
    const s = cropStageStyle(r, 2000, 1000, 200);
    assert.equal(s.width, 400);
    assert.equal(s.height, 200);
    assert.equal(s.left, -100);
    assert.equal(s.top, 0);
  });

  it("clamp stays inside the range", () => {
    assert.equal(clamp(3, 0, 2), 2);
    assert.equal(clamp(-1, 0, 2), 0);
    assert.equal(clamp(1, 0, 2), 1);
  });
});
