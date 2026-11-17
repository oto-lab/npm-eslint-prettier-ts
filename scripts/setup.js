#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const write = (path, contents) =>
  writeFile(new URL(path, import.meta.url), contents);

function parseRepository(input) {
  const remote = input
    .replace(/^git@github\.com:/i, "")
    .replace(/^https:\/\/github\.com\//i, "");
  const slug = remote.replace(/\/+$/, "").replace(/\.git$/, "");
  if (!/^[a-z0-9-]+\/[a-z0-9_.-]+$/i.test(slug)) {
    throw new Error("Enter a GitHub repository as owner/repo or a GitHub URL.");
  }
  return slug;
}

async function readAnswers() {
  const interactive = stdin.isTTY;
  const lines = createInterface({
    input: stdin,
    output: interactive ? stdout : undefined,
  });
  const answers = [];
  try {
    if (!interactive) {
      for await (const line of lines) answers.push(line);
    }
    const ask = async (label, fallback = "") => {
      const prompt = fallback ? label + " (" + fallback + "): " : label + ": ";
      const value = interactive
        ? await lines.question(prompt)
        : answers.shift();
      if (value === undefined) throw new Error("Missing answer for " + label);
      return value.trim() || fallback;
    };

    const name = await ask("Package name (npm name)");
    if (!/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/.test(name)) {
      throw new Error("Enter a valid lowercase npm package name.");
    }
    const description = await ask("Description");
    const author = await ask("Author");
    const slug = parseRepository(await ask("GitHub repository (owner/repo)"));
    const license = await ask("License identifier", "MIT");
    const keywords = (await ask("Keywords (comma-separated)"))
      .split(",")
      .map((word) => word.trim())
      .filter(Boolean);
    const invokedManager = process.env.npm_config_user_agent?.split("/")[0];
    const managers = ["npm", "pnpm", "yarn", "bun"];
    const pm = await ask(
      "Package manager (npm / pnpm / yarn / bun)",
      managers.includes(invokedManager) ? invokedManager : "npm"
    );
    if (!managers.includes(pm))
      throw new Error("Unknown package manager: " + pm);
    return { name, description, author, slug, license, keywords, pm };
  } finally {
    lines.close();
  }
}

async function main() {
  const pkg = JSON.parse(await read("../package.json"));
  if (pkg.private !== true || pkg.description !== "<package-description>") {
    throw new Error("Setup expects a fresh copy of the template.");
  }

  const { name, description, author, slug, license, keywords, pm } =
    await readAnswers();
  const gitUrl = "https://github.com/" + slug;
  const values = {
    "<package-name>": name,
    "<package-description>": description,
    "<package-author>": author,
    "<package-git>": gitUrl,
    "<package-repo>": slug,
    "<package-license>": license,
    "<pm>": pm,
  };
  const templates = [
    "../README.md",
    "../CONTRIBUTING.md",
    "../.github/dependabot.yml",
    "../.github/ISSUE_TEMPLATE/1-bug-report.yml",
    "../.github/ISSUE_TEMPLATE/2-feature-request.yml",
  ];
  const changes = await Promise.all(
    templates.map(async (path) => {
      const original = await read(path);
      const updated = original.replace(
        /<package-[a-z]+>|<pm>/g,
        (token) => values[token] ?? token
      );
      if (path === "../.github/dependabot.yml" && pm === "bun") {
        return [
          path,
          updated.replace("package-ecosystem: npm", "package-ecosystem: bun"),
        ];
      }
      return [path, updated];
    })
  );

  Object.assign(pkg, {
    name,
    description,
    author,
    license,
    keywords,
    homepage: gitUrl + "#readme",
    bugs: { url: gitUrl + "/issues" },
    repository: { type: "git", url: "git+" + gitUrl + ".git" },
  });
  delete pkg.private;
  for (const [path, contents] of changes) await write(path, contents);
  await write("../package.json", JSON.stringify(pkg, null, 2) + "\n");

  console.log(
    "Setup complete. Replace LICENSE, run " +
      pm +
      " install, and commit the generated lockfile."
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
