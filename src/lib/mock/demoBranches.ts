import type { Branch, Scene } from "@/types/workspace";
import { DEMO_SCENES } from "@/lib/mock/demoScenes";

// ---------------------------------------------------------------------------
// Alternate-path scenes branching from scene-demo-2
// ---------------------------------------------------------------------------
const ALT_SCENES_A: Scene[] = [
  {
    id: "scene-alt-2a",
    projectId: "demo-1",
    sceneNumber: 6,
    title: "The Hidden Tunnel",
    location: "Underground Aqueduct",
    dialogueExcerpt:
      '"If the market is too dangerous, we go under it," Kael said, tracing the old map with his finger.',
    characters: ["Kael", "Mira"],
    emotionalBeat: "Hope",
    reviewStatus: "Under Review",
    imageUrl: undefined,
    contributor: { id: "user-2", displayName: "Theo Park" },
    revision: 1,
    status: "draft",
    order: 1,
    parentId: "scene-demo-2",
    createdAt: "2026-07-23T10:00:00.000Z",
    updatedAt: "2026-07-23T10:00:00.000Z",
  },
  {
    id: "scene-alt-2b",
    projectId: "demo-1",
    sceneNumber: 7,
    title: "The Drowned Engine Room",
    location: "Old Power Station",
    dialogueExcerpt:
      "The turbines still turned. Nobody had switched them off. Nobody had been able to.",
    characters: ["Kael", "Mira", "The Archivist"],
    emotionalBeat: "Unease",
    reviewStatus: "Draft",
    imageUrl: undefined,
    contributor: { id: "user-3", displayName: "Rahat Islam" },
    revision: 1,
    status: "draft",
    order: 2,
    parentId: "scene-alt-2a",
    createdAt: "2026-07-23T12:00:00.000Z",
    updatedAt: "2026-07-23T12:00:00.000Z",
  },
];

// ---------------------------------------------------------------------------
// Exported demo branches for project "demo-1"
// ---------------------------------------------------------------------------
export const DEMO_BRANCHES: Branch[] = [
  {
    id: "branch-canon",
    projectId: "demo-1",
    name: "Canon",
    sourceSceneId: "scene-demo-1",
    scenes: DEMO_SCENES,
    isCanon: true,
    createdAt: "2026-07-20T08:00:00.000Z",
    updatedAt: "2026-07-24T16:00:00.000Z",
  },
  {
    id: "branch-tunnel",
    projectId: "demo-1",
    name: "The Tunnel Route",
    sourceSceneId: "scene-demo-2",
    scenes: ALT_SCENES_A,
    isCanon: false,
    createdAt: "2026-07-23T10:00:00.000Z",
    updatedAt: "2026-07-23T12:00:00.000Z",
  },
];
