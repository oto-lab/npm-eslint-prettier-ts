import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import semver from "semver";

const bump = new Set(["patch", "minor", "major"]);
const preidPattern = /^[a-z]+$/;
const shortPrerelease = /^(\d+\.\d+\.\d+)-([a-z]+)$/;

export function selectVersion({
  current,
  tags,
  version,
  preid = "",
  distTag = "",
}) {
  if (preid && !preidPattern.test(preid)) {
    throw new Error("preid must contain lowercase letters only.");
  }
  if (
    distTag &&
    (!/^[a-zA-Z][a-zA-Z0-9._-]*$/.test(distTag) || semver.validRange(distTag))
  ) {
    throw new Error("Invalid npm dist-tag.");
  }

  const tagVersions = tags
    .filter((tag) => tag.startsWith("v"))
    .map((tag) => semver.valid(tag))
    .filter(Boolean);
  const latest = semver.rsort([current, ...tagVersions])[0];
  const selected = version.replace(/^v/, "");
  let next;
  let explicit = false;

  if (bump.has(version)) {
    next = semver.inc(latest, preid ? "pre" + version : version, {}, preid);
  } else if (version === "prerelease") {
    if (!preid && !semver.prerelease(latest))
      throw new Error("A prerelease needs an identifier.");
    next = semver.inc(latest, "prerelease", {}, preid);
  } else {
    if (preid)
      throw new Error("Leave preid empty when entering an explicit version.");
    if (shortPrerelease.test(selected)) {
      const series = [...tagVersions, current].filter((tag) => {
        const suffix =
          tag.startsWith(selected + ".") && tag.slice(selected.length + 1);
        return suffix && /^\d+$/.test(suffix);
      });
      const previous = semver.rsort(series)[0];
      next = previous
        ? semver.inc(previous, "prerelease", {}, selected.split("-")[1])
        : selected + ".0";
    } else {
      explicit = true;
      next = selected;
    }
  }

  if (!next || semver.valid(next) !== next)
    throw new Error("Invalid or noncanonical version: " + version);
  const pre = semver.prerelease(next);
  if (
    pre &&
    (pre.length !== 2 ||
      !preidPattern.test(pre[0]) ||
      typeof pre[1] !== "number")
  ) {
    throw new Error(
      "Use a lowercase prerelease identifier followed by one number, such as rc.0."
    );
  }

  if (semver.lt(next, latest) || (!explicit && next === latest)) {
    throw new Error("The next version must be newer than " + latest + ".");
  }
  const tag = "v" + next;
  const retry = tags.includes(tag);
  if (retry && (!explicit || next !== latest)) {
    throw new Error("Only the latest version can be retried.");
  }
  return {
    tag,
    retry,
    dist_tag: distTag || pre?.[0] || "latest",
    prerelease: Boolean(pre),
  };
}

function main() {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  if (pkg.private) throw new Error("Run template setup before publishing.");
  const tags = execFileSync("git", ["tag", "--list", "v*"], {
    encoding: "utf8",
  })
    .trim()
    .split("\n");
  const selected = selectVersion({
    current: pkg.version,
    tags,
    version: process.env.VERSION,
    preid: process.env.PREID,
    distTag: process.env.DIST_TAG,
  });
  const output = Object.entries(selected)
    .map(([key, value]) => key + "=" + value)
    .join("\n");
  if (process.env.GITHUB_OUTPUT)
    appendFileSync(process.env.GITHUB_OUTPUT, output + "\n");
  else console.log(output);
}

if (import.meta.main) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
