import assert from "node:assert/strict";
import { test } from "node:test";
import { selectVersion } from "./next-version.js";

const cases = [
  ["1.0.0", "minor", "rc", "1.1.0-rc.0"],
  ["1.0.0", "major", "beta", "2.0.0-beta.0"],
  ["1.0.0", "prerelease", "rc", "1.0.1-rc.0"],
  ["1.1.0-rc.0", "prerelease", "", "1.1.0-rc.1"],
  ["1.1.0-beta.2", "prerelease", "rc", "1.1.0-rc.0"],
  ["1.1.0-rc.1", "minor", "", "1.1.0"],
  ["1.1.0", "1.2.0-rc", "", "1.2.0-rc.0"],
  ["1.2.0-rc.1", "1.2.0-rc", "", "1.2.0-rc.2"],
];

for (const [current, version, preid, next] of cases) {
  test([current, version, preid].join(" ") + " resolves to " + next, () => {
    const branch = next.split("-")[1]?.split(".")[0];
    assert.deepEqual(selectVersion({ current, version, preid, tags: [] }), {
      tag: "v" + next,
      retry: false,
      dist_tag: branch ?? "latest",
      prerelease: Boolean(branch),
    });
  });
}

test("selects a prerelease number newer than all existing release tags", () => {
  const args = {
    current: "1.1.0",
    tags: ["v1.2.0-rc.9", "v1.2.0-rc.10"],
    version: "1.2.0-rc",
  };
  assert.equal(selectVersion(args).tag, "v1.2.0-rc.11");
});

test("explicit latest tag retries, and an older tag is rejected", () => {
  const args = { current: "1.2.0-rc.1", tags: ["v1.1.0", "v1.2.0-rc.1"] };
  assert.equal(selectVersion({ ...args, version: "v1.2.0-rc.1" }).retry, true);
  assert.throws(
    () => selectVersion({ ...args, version: "1.1.0" }),
    /must be newer/
  );
});

test("an explicit current version without a tag can finish an untagged release", () => {
  assert.equal(
    selectVersion({ current: "1.2.0", tags: [], version: "1.2.0" }).retry,
    false
  );
});

test("prerelease after stable needs an identifier", () => {
  assert.throws(
    () => selectVersion({ current: "1.0.0", tags: [], version: "prerelease" }),
    /needs an identifier/
  );
});

test("a prerelease identifier cannot move backwards", () => {
  assert.throws(
    () =>
      selectVersion({
        current: "1.1.0-rc.0",
        tags: [],
        version: "prerelease",
        preid: "beta",
      }),
    /must be newer/
  );
});

test("the dist-tag override does not change whether the GitHub Release is a prerelease", () => {
  const result = selectVersion({
    current: "1.0.0",
    tags: [],
    version: "1.1.0-rc.0",
    distTag: "next",
  });
  assert.equal(result.dist_tag, "next");
  assert.equal(result.prerelease, true);
});
