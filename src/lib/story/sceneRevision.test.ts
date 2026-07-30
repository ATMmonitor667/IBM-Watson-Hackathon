import { describe, expect, it } from "vitest";

import {
  createEditedScene,
  createSceneRevision,
} from "@/lib/story/sceneRevision";
import { DEMO_BRANCHES } from "@/lib/mock/demoBranches";

const alternate = DEMO_BRANCHES.find((branch) => !branch.isCanon)!;
const original = alternate.scenes[0];

describe("scene revision helpers", () => {
  it("creates a new draft revision without mutating the source scene", () => {
    const edited = createEditedScene(
      original,
      {
        title: "The Safer Tunnel",
        location: original.location,
        dialogueExcerpt: original.dialogueExcerpt,
        characters: [...original.characters, "The Guide"],
        emotionalBeat: "Relief",
      },
      { id: "user-editor", displayName: "Editor" },
      "2026-07-30T20:00:00.000Z",
    );

    expect(edited).toMatchObject({
      id: original.id,
      title: "The Safer Tunnel",
      revision: original.revision + 1,
      reviewStatus: "Draft",
      continuityFlag: undefined,
      contributor: { id: "user-editor", displayName: "Editor" },
    });
    expect(original.title).toBe("The Hidden Tunnel");
    expect(original.characters).not.toContain("The Guide");
  });

  it("captures the complete previous revision before an edit", () => {
    const snapshot = createSceneRevision(original, alternate.id);

    expect(snapshot).toMatchObject({
      sceneId: original.id,
      branchId: alternate.id,
      revision: original.revision,
      title: original.title,
      location: original.location,
      dialogueExcerpt: original.dialogueExcerpt,
      characters: original.characters,
      emotionalBeat: original.emotionalBeat,
    });
    expect(snapshot.characters).not.toBe(original.characters);
  });
});
