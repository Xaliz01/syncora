import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { latestSemver, nextVersionFromTags, parseSemverTag } from "./next-version.mjs";

describe("parseSemverTag", () => {
  it("accepte vX.Y.Z", () => {
    assert.deepEqual(parseSemverTag("v1.2.3"), { major: 1, minor: 2, patch: 3 });
  });

  it("ignore un SHA ou un tag incomplet", () => {
    assert.equal(parseSemverTag("a1b2c3d"), null);
    assert.equal(parseSemverTag("v1.2"), null);
    assert.equal(parseSemverTag("1.2.3"), null);
    assert.equal(parseSemverTag("v1.2.3-rc.1"), null);
  });
});

describe("latestSemver", () => {
  it("prend le plus grand tag, pas le dernier de la liste", () => {
    assert.deepEqual(latestSemver(["v0.2.0", "v0.10.0", "v0.9.4", "latest"]), {
      major: 0,
      minor: 10,
      patch: 0,
    });
  });

  it("retourne null sans tag SemVer", () => {
    assert.equal(latestSemver(["a1b2c3d", ""]), null);
  });
});

describe("nextVersionFromTags", () => {
  it("démarre à v0.0.1, v0.1.0 ou v1.0.0 sans tag", () => {
    assert.equal(nextVersionFromTags([], "patch"), "v0.0.1");
    assert.equal(nextVersionFromTags([], "minor"), "v0.1.0");
    assert.equal(nextVersionFromTags([], "major"), "v1.0.0");
  });

  it("incrémente et remet les rangs inférieurs à zéro", () => {
    const tags = ["v1.4.2", "v0.9.0"];
    assert.equal(nextVersionFromTags(tags, "patch"), "v1.4.3");
    assert.equal(nextVersionFromTags(tags, "minor"), "v1.5.0");
    assert.equal(nextVersionFromTags(tags, "major"), "v2.0.0");
  });

  it("refuse un incrément inconnu", () => {
    assert.throws(() => nextVersionFromTags(["v1.0.0"], "build"), /Incrément inconnu/);
  });
});
