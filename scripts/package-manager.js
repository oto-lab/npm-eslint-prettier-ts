import { existsSync, readFileSync } from "node:fs";

const lockfiles = {
  npm: ["package-lock.json"],
  pnpm: ["pnpm-lock.yaml"],
  yarn: ["yarn.lock"],
  bun: ["bun.lock", "bun.lockb"],
};

const managers = Object.entries(lockfiles).filter(([, paths]) =>
  paths.some((path) => existsSync(path))
);
if (managers.length > 1) {
  throw new Error("Commit lockfiles from only one package manager.");
}

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const manager = managers[0]?.[0];
if (!manager && !pkg.private) {
  throw new Error(
    "Run your package manager install command and commit its lockfile."
  );
}

console.log(`manager=${manager ?? "npm"}`);
if (manager === "pnpm" && !pkg.packageManager?.startsWith("pnpm@")) {
  console.log("pnpm-fallback=10");
}
if (
  manager === "yarn" &&
  !pkg.packageManager &&
  readFileSync("yarn.lock", "utf8").includes("# yarn lockfile v1")
) {
  console.log("yarn-classic-fallback=true");
}
