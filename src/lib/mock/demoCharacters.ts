import type { Character } from "@/types/character";

// ---------------------------------------------------------------------------
// Demo characters for "The Flooded City" (project id: "demo-1").
//
// Referenced by src/store/characterStore.ts (loadCharacters). Ids, names, and
// project id match src/lib/mock/demoScenes.ts — the cast here is exactly the
// cast that appears in the scenes' `characters` arrays, so Character Studio and
// the scene canvas cannot disagree about who is in this story.
//
// MOCK: replaced by a real characters query once the character API lands
// (issue #11 / #19 in STORYVERSE_TODO.txt).
//
// Kael ships with two versions and a LOCKED reference on purpose: the demo's
// Character Studio beat is "compare an original against a refined version, then
// lock one". With only one unlocked version there is nothing to demonstrate.
// ---------------------------------------------------------------------------

export const DEMO_CHARACTERS: Character[] = [
  {
    id: "char-kael",
    projectId: "demo-1",
    name: "Kael",
    role: "Protagonist / Explorer",
    description:
      "A diver in a patched pressure suit who reads the drowned city by touch " +
      "and memory. Carries the compass on a short chain at the left hip.",
    visualTraits: [
      "Patched grey-green pressure suit",
      "Cropped dark hair, salt-stiff",
      "Scar through the left brow",
      "Compass on a short chain at the left hip",
    ],
    versions: [
      {
        id: "char-kael-v1",
        imageUrl: "/demo/wren-v1.svg",
        description:
          "First pass. Silhouette reads well at full size but the suit detail " +
          "muddies at panel scale.",
        visualTraits: [
          "Patched grey-green pressure suit",
          "Cropped dark hair, salt-stiff",
          "Scar through the left brow",
        ],
        source: "original",
        createdAt: "2026-07-24T10:30:00.000Z",
      },
      {
        id: "char-kael-v2",
        imageUrl: "/demo/wren-v2.svg",
        description:
          "Refined for visual consistency: sharper silhouette, palette reduced " +
          "to three values plus the brass compass accent, and the compass " +
          "given a fixed position so it reads the same in every panel.",
        visualTraits: [
          "Patched grey-green pressure suit",
          "Cropped dark hair, salt-stiff",
          "Scar through the left brow",
          "Compass on a short chain at the left hip",
          "Consistent palette lock",
        ],
        source: "ai-refined",
        createdAt: "2026-07-25T16:05:00.000Z",
      },
    ],
    // The locked reference every generated panel must respect.
    lockedVersionId: "char-kael-v2",
    createdAt: "2026-07-24T10:30:00.000Z",
    updatedAt: "2026-07-25T16:05:00.000Z",
  },
  {
    id: "char-mira",
    projectId: "demo-1",
    name: "Mira",
    role: "Companion / Signal reader",
    description:
      "Keeps the lighthouse logs and knows which channels still carry a signal. " +
      "Sceptical of the compass and of anyone who trusts it.",
    visualTraits: [
      "Oilskin coat, cuffs turned back",
      "Copper-wire earpiece, always worn",
      "Tall, deliberate posture",
    ],
    versions: [
      {
        id: "char-mira-v1",
        imageUrl: "/demo/stranger-v1.svg",
        description:
          "Base design. Not yet locked — the coat silhouette still competes " +
          "with Kael's at a distance.",
        visualTraits: [
          "Oilskin coat, cuffs turned back",
          "Copper-wire earpiece, always worn",
          "Tall, deliberate posture",
        ],
        source: "original",
        createdAt: "2026-07-24T11:10:00.000Z",
      },
    ],
    // Deliberately unlocked: the studio needs to show both states.
    lockedVersionId: null,
    createdAt: "2026-07-24T11:10:00.000Z",
    updatedAt: "2026-07-24T11:10:00.000Z",
  },
];
