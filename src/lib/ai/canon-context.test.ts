import { describe, expect, it } from "vitest";

import {
  buildCanonContext,
  renderCanonContext,
} from "@/lib/ai/canon-context";
import {
  CANON_BRANCH_ID,
  PROJECT,
  WHATIF_BRANCH_ID,
} from "@/lib/demo/fixtures";
import { CanonContextSchema } from "@/lib/types/schemas";

/** Plan §10, test 1. */
describe("buildCanonContext", () => {
  it("builds the what-if timeline's context", async () => {
    const context = await buildCanonContext(PROJECT.id, WHATIF_BRANCH_ID);

    expect(() => CanonContextSchema.parse(context)).not.toThrow();
    expect(context.project.title).toBe("The Drowned Compass");
    expect(context.scenes).toHaveLength(5);
    expect(context.scenes.map((s) => s.order)).toEqual([0, 1, 2, 3, 4]);
  });

  it("keeps canon facts and branch facts in separate lists", async () => {
    const context = await buildCanonContext(PROJECT.id, WHATIF_BRANCH_ID);

    const canon = context.canonFacts.map((f) => f.statement);
    const branch = context.branchFacts.map((f) => f.statement);

    expect(canon).toContain("The brass compass is in Wren's possession.");
    expect(branch).toContain(
      "Wren gave the brass compass to the stranger at the drowned stair.",
    );

    // The contradiction only exists because these two never merge.
    expect(canon).not.toContain(
      "Wren gave the brass compass to the stranger at the drowned stair.",
    );
    expect(context.branchFacts.every((f) => f.branch !== undefined)).toBe(true);
  });

  it("carries canon but no branch facts for the canon timeline", async () => {
    const context = await buildCanonContext(PROJECT.id, CANON_BRANCH_ID);
    expect(context.branchFacts).toEqual([]);
    expect(context.canonFacts.length).toBeGreaterThan(0);
    expect(context.scenes).toHaveLength(4);
  });

  it("includes the locked character sheet, not the unlocked one", async () => {
    const context = await buildCanonContext(PROJECT.id, CANON_BRANCH_ID);

    expect(context.lockedCharacters).toHaveLength(1);
    expect(context.lockedCharacters[0].name).toBe("Wren");
    expect(context.lockedCharacters[0].clothing_rules.join(" ")).toContain(
      "left hip",
    );
  });

  it("carries the structured fields the continuity check reasons over", async () => {
    const context = await buildCanonContext(PROJECT.id, WHATIF_BRANCH_ID);
    const s4 = context.scenes.find((s) => s.id === "scene-wf-s4");

    expect(s4?.props_used).toContain("brass compass");
    expect(s4?.characters_present).toEqual(["character-wren"]);
  });

  it("rejects an unknown project rather than sending an empty prompt", async () => {
    await expect(
      buildCanonContext("project-nope", CANON_BRANCH_ID),
    ).rejects.toThrow(/no project/);
  });

  it("rejects an unknown branch", async () => {
    await expect(
      buildCanonContext(PROJECT.id, "branch-nope"),
    ).rejects.toThrow(/no branch/);
  });
});

describe("renderCanonContext", () => {
  it("labels canon and branch facts distinctly in the prompt text", async () => {
    const context = await buildCanonContext(PROJECT.id, WHATIF_BRANCH_ID);
    const text = renderCanonContext(context);

    expect(text).toContain("CANON FACTS");
    expect(text).toContain("THIS TIMELINE ONLY (not canon):");
    expect(text).toContain("LOCKED CHARACTER DESIGNS");
    expect(text).toContain("SCENES, IN ORDER:");

    // The section header must come before the branch-only fact, or the model
    // has no way to tell inherited truth from local truth.
    expect(text.indexOf("THIS TIMELINE ONLY")).toBeLessThan(
      text.indexOf("Wren gave the brass compass"),
    );
  });

  it("keeps scenes in order and cites them by id", async () => {
    const context = await buildCanonContext(PROJECT.id, CANON_BRANCH_ID);
    const text = renderCanonContext(context);

    expect(text.indexOf("scene-main-s1")).toBeLessThan(
      text.indexOf("scene-main-s4"),
    );
  });
});
