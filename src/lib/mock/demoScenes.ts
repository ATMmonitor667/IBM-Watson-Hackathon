import type { Scene } from "@/types/workspace";

// ---------------------------------------------------------------------------
// Hard-coded demo scenes for "The Flooded City" (project id: "demo-1")
// Used until the real scene API is wired up.
// Field names match the shared Scene type in src/types/workspace.ts
//
// NOTE: `continuityFlag` is deliberately left undefined on every scene. Those
// findings are COMPUTED by src/lib/ai/continuityRules.ts from the structured
// fields below — writing them out here would mean the app displays a finding
// nothing actually detected. A test enforces this (continuityRules.test.ts,
// "the demo data no longer carries written-out findings").
//
// The fields the engine reads are `characters`, `dialogueExcerpt`, `propsUsed`
// and `propEvents`. Keep them consistent with each other when editing a scene,
// or the engine will correctly tell you that you did not.
//
// `propEvents` is story data, not a finding: Scene 1 records that Kael comes up
// holding the compass. Canon then carries the compass through every remaining
// scene with Kael in it, so the possession rule runs over canon and stays
// silent — the silence is earned, not assumed. The tunnel branch takes the
// compass away (see demoBranches.ts) and the rule fires there.
// ---------------------------------------------------------------------------

export const DEMO_SCENES: Scene[] = [
  {
    id: "scene-demo-1",
    projectId: "demo-1",
    sceneNumber: 1,
    title: "The Surface Breaks",
    location: "Submerged Central Station",
    dialogueExcerpt:
      '"The water remembers everything," Kael whispered, watching the compass spin. "That\'s what makes it dangerous."',
    action: "Kael breaks the surface and watches the compass spin.",
    characters: ["Kael", "The Compass"],
    propsUsed: ["The Compass"],
    propEvents: [
      {
        prop: "The Compass",
        holder: "Kael",
        note: "Kael breaks the surface with the compass on his belt.",
      },
    ],
    emotionalBeat: "Dread",
    reviewStatus: "Approved",
    continuityFlag: undefined,
    imageUrl: undefined,
    contributor: { id: "user-1", displayName: "Amara Singh" },
    revision: 4,
    status: "canon",
    order: 1,
    parentId: null,
    createdAt: "2026-07-20T08:00:00.000Z",
    updatedAt: "2026-07-23T14:30:00.000Z",
  },
  {
    id: "scene-demo-2",
    projectId: "demo-1",
    sceneNumber: 2,
    title: "The Market Beneath",
    location: "Flooded Market District",
    dialogueExcerpt:
      "Vendors still called out prices in the old tongue — their voices carried through six feet of green water as though the flood had never come.",
    action: "Kael and Mira cross the submerged market with the compass.",
    characters: ["Kael", "Mira", "The Ferryman"],
    propsUsed: ["The Compass"],
    emotionalBeat: "Melancholy",
    reviewStatus: "Under Review",
    continuityFlag: undefined,
    imageUrl: undefined,
    contributor: { id: "user-2", displayName: "Theo Park" },
    revision: 2,
    status: "canon",
    order: 2,
    parentId: null,
    createdAt: "2026-07-21T09:15:00.000Z",
    updatedAt: "2026-07-24T10:00:00.000Z",
  },
  {
    id: "scene-demo-3",
    projectId: "demo-1",
    sceneNumber: 3,
    title: "The Lighthouse Signal",
    location: "Old Harbour Lighthouse",
    dialogueExcerpt:
      'Mira grabbed his arm. "It\'s pointing up. Compasses don\'t point up." Kael stared at the needle. "This one does."',
    action: "The compass needle turns upward as Mira stops Kael.",
    characters: ["Kael", "Mira"],
    propsUsed: ["The Compass"],
    emotionalBeat: "Tension",
    reviewStatus: "Draft",
    continuityFlag: undefined,
    imageUrl: undefined,
    contributor: { id: "user-1", displayName: "Amara Singh" },
    revision: 1,
    status: "draft",
    order: 3,
    parentId: null,
    createdAt: "2026-07-22T11:00:00.000Z",
    updatedAt: "2026-07-22T11:00:00.000Z",
  },
  {
    id: "scene-demo-4",
    projectId: "demo-1",
    sceneNumber: 4,
    title: "Below the Archive",
    location: "Submerged City Archive",
    dialogueExcerpt:
      "The books had not rotted. The ink had not run. Whatever preserved them was not water — and it was not natural.",
    action: "Kael opens the preserved archive while the Archivist watches.",
    characters: ["Kael", "The Archivist"],
    propsUsed: ["The Compass", "Preserved books"],
    emotionalBeat: "Wonder",
    reviewStatus: "Approved",
    continuityFlag: undefined,
    imageUrl: undefined,
    contributor: { id: "user-3", displayName: "Rahat Islam" },
    revision: 3,
    status: "canon",
    order: 4,
    parentId: null,
    createdAt: "2026-07-23T13:45:00.000Z",
    updatedAt: "2026-07-24T09:20:00.000Z",
  },
  {
    id: "scene-demo-5",
    projectId: "demo-1",
    sceneNumber: 5,
    title: "The Choice at the Gate",
    location: "Northern Flood Gate",
    dialogueExcerpt:
      '"Open the gate and the lower city drowns. Leave it shut and the upper city starves." The Ferryman spread his hands. "That\'s the only choice left."',
    action: "The group confronts the final choice at the northern flood gate.",
    characters: ["Kael", "Mira", "The Ferryman", "The Archivist"],
    propsUsed: ["The Compass", "Flood gate controls"],
    emotionalBeat: "Despair",
    reviewStatus: "Merged",
    continuityFlag: undefined,
    imageUrl: undefined,
    contributor: { id: "user-2", displayName: "Theo Park" },
    revision: 5,
    status: "canon",
    order: 5,
    parentId: null,
    createdAt: "2026-07-24T07:30:00.000Z",
    updatedAt: "2026-07-24T16:00:00.000Z",
  },
];
