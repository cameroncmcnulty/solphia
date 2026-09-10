import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ADMIN_GROUPS, ADMIN_NAV, filterAdminNav, isAdminSection } from "../lib/admin/nav";

describe("admin nav", () => {
  it("has unique ids", () => {
    const ids = ADMIN_NAV.map((n) => n.id);
    assert.equal(ids.length, new Set(ids).size);
  });

  it("every item maps to a known group", () => {
    const g = new Set(ADMIN_GROUPS.map((x) => x.id));
    for (const n of ADMIN_NAV) assert.ok(g.has(n.group), n.id);
  });

  it("filters by label and group", () => {
    const spha = filterAdminNav("spha");
    assert.ok(spha.some((n) => n.id === "spha"));
    const proto = filterAdminNav("protocol");
    assert.ok(proto.some((n) => n.group === "protocol"));
    assert.equal(filterAdminNav("zzzz-nope").length, 0);
  });

  it("accepts known section hashes", () => {
    assert.equal(isAdminSection("overview"), true);
    assert.equal(isAdminSection("users"), true);
    assert.equal(isAdminSection("not-a-tool"), false);
  });
});
