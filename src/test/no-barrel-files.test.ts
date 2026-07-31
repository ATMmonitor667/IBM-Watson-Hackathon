import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { afterEach, describe, expect, it } from "vitest";

/**
 * Guard against auto-generated barrel files.
 *
 * An IDE extension in this project keeps generating `index.ts` files that
 * re-export everything in their directory. They have broken `npm run typecheck`
 * three times: they re-export route handlers (duplicate GET/POST), they point
 * at directories with no module, and they collide on names exported by two
 * different modules.
 *
 * Nothing in this codebase imports from a barrel, so every index.ts/index.tsx
 * under src/ is prohibited. The same executable guard runs before typecheck;
 * these tests verify both its clean-repository and failure behavior.
 */

const guardPath = join(process.cwd(), "scripts", "check-barrels.mjs");
const temporaryDirectories: string[] = [];

function runGuard(sourceRoot: string) {
  return spawnSync(process.execPath, [guardPath, sourceRoot], {
    encoding: "utf8",
  });
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("no auto-generated barrel files under src/", () => {
  it("accepts the repository source tree", () => {
    const result = runGuard(join(process.cwd(), "src"));

    expect(result.status, result.stderr).toBe(0);
  });

  it("reports every generated TypeScript index file", () => {
    const sourceRoot = mkdtempSync(join(tmpdir(), "storyverse-barrels-"));
    temporaryDirectories.push(sourceRoot);
    mkdirSync(join(sourceRoot, "components", "nested"), { recursive: true });
    writeFileSync(join(sourceRoot, "components", "index.ts"), "");
    writeFileSync(
      join(sourceRoot, "components", "nested", "index.tsx"),
      "export * from './Scene';",
    );

    const result = runGuard(sourceRoot);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Prohibited barrel index files found:");
    expect(result.stderr).toContain("components/index.ts");
    expect(result.stderr).toContain("components/nested/index.tsx");
  });
});
