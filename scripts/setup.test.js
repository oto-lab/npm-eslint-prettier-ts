import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

test("setup configures a fresh copy using piped answers", (t) => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  if (pkg.description !== "<package-description>") {
    t.skip("Setup smoke test applies to the original template.");
    return;
  }

  const checkout = mkdtempSync(join(tmpdir(), "npm-template-"));
  t.after(() => rmSync(checkout, { recursive: true, force: true }));
  const paths = [
    "README.md",
    "CONTRIBUTING.md",
    ".github/dependabot.yml",
    "package.json",
    "scripts/setup.js",
    ".github/ISSUE_TEMPLATE/1-bug-report.yml",
    ".github/ISSUE_TEMPLATE/2-feature-request.yml",
  ];
  for (const path of paths) {
    const dest = join(checkout, path);
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(join(root, path), dest);
  }

  const input =
    "@example/test-library\nA sample library\nTest Author\nexample/library.name\n\nexample,test\nbun\n";
  const result = spawnSync(process.execPath, ["scripts/setup.js"], {
    cwd: checkout,
    input,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  const configured = JSON.parse(
    readFileSync(join(checkout, "package.json"), "utf8")
  );
  assert.equal(configured.name, "@example/test-library");
  assert.equal(configured.private, undefined);
  assert.equal(
    configured.repository.url,
    "git+https://github.com/example/library.name.git"
  );
  assert.deepEqual(configured.keywords, ["example", "test"]);
  assert.match(
    readFileSync(join(checkout, "CONTRIBUTING.md"), "utf8"),
    /bun run build/
  );
  assert.match(
    readFileSync(join(checkout, ".github/dependabot.yml"), "utf8"),
    /package-ecosystem: bun/
  );
});
