#!/usr/bin/env node

import { readdirSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

const PROHIBITED_NAMES = new Set(["index.ts", "index.tsx"]);

function findProhibitedIndexFiles(directory, sourceRoot, found = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = resolve(directory, entry.name);

    if (entry.isDirectory()) {
      findProhibitedIndexFiles(fullPath, sourceRoot, found);
    } else if (entry.isFile() && PROHIBITED_NAMES.has(entry.name)) {
      found.push(relative(sourceRoot, fullPath).split(sep).join("/"));
    }
  }

  return found;
}

const sourceRoot = resolve(process.argv[2] ?? resolve(process.cwd(), "src"));
const offenders = findProhibitedIndexFiles(sourceRoot, sourceRoot).sort();

if (offenders.length > 0) {
  console.error(
    [
      "Prohibited barrel index files found:",
      ...offenders.map((file) => `  ${file}`),
      "",
      "Storyverse uses direct imports. Delete these generated files and review",
      ".vscode/settings.json before running typecheck again.",
    ].join("\n"),
  );
  process.exitCode = 1;
}
