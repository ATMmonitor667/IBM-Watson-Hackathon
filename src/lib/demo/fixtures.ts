import type {
  ActivityEvent,
  AiReview,
  Branch,
  Character,
  CharacterVersion,
  ContinuityFinding,
  Profile,
  Project,
  ProjectMember,
  Scene,
  SceneVersion,
  SceneWithVersion,
  WorldFact,
} from "@/lib/types/schemas";

/**
 * THE DEMO, AS TYPED DATA — step P2 in STORYVERSE_IMPLEMENTATION_PLAN.txt §6.
 *
 * "The Drowned Compass" in full: one project, two collaborators, a locked
 * character, a canon timeline, a what-if timeline, and one planted
 * contradiction that the continuity inspector must find.
 *
 * This file is consumed by THREE things, which is why the story is written
 * once and only once:
 *
 *   src/lib/db/queries.ts     when NEXT_PUBLIC_USE_FIXTURES=1
 *   supabase/seed/seed.ts     the real database (so mock and seeded data are identical)
 *   src/lib/ai/*.test.ts      the rule engine's and the model's test inputs
 *
 * Every constant here satisfies the schemas in src/lib/types/schemas.ts —
 * fixtures.test.ts parses all of it, so drift fails the build rather than the
 * demo.
 *
 * THE PLANTED CONTRADICTION (plan §1) — do not "fix" it:
 *   canon S2   establishes  "the brass compass is in Wren's possession"
 *   what-if S3 establishes  Wren gives the compass away
 *   what-if S4 still lists  'brass compass' in props_used   <-- the finding
 */

/* -------------------------------------------------------------------------- */
/* People                                                                      */
/* -------------------------------------------------------------------------- */

/** The creator. Owns canon, approves merges. */
export const CREATOR: Profile = {
  id: "user-rahat",
  display_name: "Rahat",
  avatar_url: null,
};

/**
 * The collaborator who writes the what-if timeline. A REAL second seeded
 * account, not a bypass (plan §4) — the demo signs in as them in a second
 * browser profile.
 */
export const COLLABORATOR: Profile = {
  id: "user-omit",
  display_name: "Omit",
  avatar_url: null,
};

export const PROFILES: Profile[] = [CREATOR, COLLABORATOR];

/* -------------------------------------------------------------------------- */
/* Project                                                                     */
/* -------------------------------------------------------------------------- */

export const PROJECT: Project = {
  id: "project-drowned-compass",
  owner_id: CREATOR.id,
  title: "The Drowned Compass",
  premise:
    "A young explorer wades into a city the sea took, hunting a brass compass " +
    "that is said to point at whatever you have lost rather than at north.",
  visual_style:
    "Hand-inked linework over flat washes. Drowned teal and silt brown, with " +
    "one warm brass accent reserved for the compass. No rendered highlights.",
  format: "comic",
  created_at: "2026-07-24T09:00:00.000Z",
};

export const MEMBERS: ProjectMember[] = [
  { project_id: PROJECT.id, user_id: CREATOR.id, role: "owner" },
  { project_id: PROJECT.id, user_id: COLLABORATOR.id, role: "collaborator" },
];

/* -------------------------------------------------------------------------- */
/* Branches (timelines)                                                        */
/* -------------------------------------------------------------------------- */

export const CANON_BRANCH_ID = "branch-main";
export const WHATIF_BRANCH_ID = "branch-what-if";

export const BRANCHES: Branch[] = [
  {
    id: CANON_BRANCH_ID,
    project_id: PROJECT.id,
    name: "main",
    parent_branch_id: null,
    branched_from_scene_id: null,
    is_canon: true,
    state: "approved",
    created_by: CREATOR.id,
    created_at: "2026-07-24T09:00:00.000Z",
  },
  {
    id: WHATIF_BRANCH_ID,
    project_id: PROJECT.id,
    name: "what-if/save-the-stranger",
    parent_branch_id: CANON_BRANCH_ID,
    // The fork happens AT S2 — the last scene the two timelines share.
    branched_from_scene_id: "scene-main-s2",
    is_canon: false,
    state: "under_review",
    created_by: COLLABORATOR.id,
    created_at: "2026-07-27T14:12:00.000Z",
  },
];

/* -------------------------------------------------------------------------- */
/* Characters                                                                  */
/* -------------------------------------------------------------------------- */

export const CHARACTER_VERSIONS: CharacterVersion[] = [
  {
    id: "wren-v1",
    character_id: "character-wren",
    version_no: 1,
    image_url: "/demo/wren-v1.svg",
    palette: ["#2f4f4f", "#8a7a5c", "#d9cbb0"],
    traits: {
      age: "seventeen",
      build: "slight, wiry from climbing",
      hair: "cropped dark, salt-stiff",
      face: "wide-set eyes, a scar through the left brow",
    },
    clothing_rules: [
      "Oilskin coat, always cinched at the waist with a rope belt.",
      "Bare feet — Wren lost both boots in the first flood.",
    ],
    created_by: CREATOR.id,
    created_at: "2026-07-24T10:30:00.000Z",
  },
  {
    id: "wren-v2",
    character_id: "character-wren",
    version_no: 2,
    image_url: "/demo/wren-v2.svg",
    palette: ["#22403f", "#7c6a4a", "#e2d6bb", "#c08a3e"],
    traits: {
      age: "seventeen",
      build: "slight, wiry from climbing",
      hair: "cropped dark, salt-stiff",
      face: "wide-set eyes, a scar through the left brow",
      posture: "leans forward from the hips, always half-way to running",
    },
    clothing_rules: [
      "Oilskin coat, always cinched at the waist with a rope belt.",
      "Bare feet — Wren lost both boots in the first flood.",
      "The brass compass hangs at the left hip when carried, never around the neck.",
    ],
    created_by: CREATOR.id,
    created_at: "2026-07-25T16:05:00.000Z",
  },
  {
    id: "stranger-v1",
    character_id: "character-stranger",
    version_no: 1,
    image_url: "/demo/stranger-v1.svg",
    palette: ["#3a3a44", "#6d6a5e"],
    traits: {
      build: "tall, stooped",
      face: "obscured — hood and silt",
    },
    clothing_rules: ["Sodden canvas hood; the face is never fully shown."],
    created_by: COLLABORATOR.id,
    created_at: "2026-07-27T14:20:00.000Z",
  },
];

export const CHARACTERS: Character[] = [
  {
    id: "character-wren",
    project_id: PROJECT.id,
    name: "Wren",
    summary:
      "A seventeen-year-old scavenger who knows the drowned city's rooftops " +
      "better than anyone left alive, and cannot swim a stroke.",
    // Locked to v2 — the reference every generated panel must respect.
    locked_version_id: "wren-v2",
  },
  {
    id: "character-stranger",
    project_id: PROJECT.id,
    name: "The stranger",
    summary:
      "Someone pinned under the drowned stair, calling out as the water rises. " +
      "Introduced by the what-if timeline; not yet canon.",
    locked_version_id: null,
  },
];

/* -------------------------------------------------------------------------- */
/* Scenes                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Scenes and their versions are co-located while being authored, then split
 * into the two flat tables the database actually has. Keeping them adjacent is
 * what makes the contradiction reviewable by eye in this file; keeping the
 * tables flat is what makes the seed script a straight insert.
 */
type SceneSeed = {
  id: string;
  branch_id: string;
  order_index: number;
  title: string;
  forked_from_scene_id?: string;
  version: Omit<SceneVersion, "id" | "scene_id" | "version_no"> & {
    version_no?: number;
  };
};

function split(seeds: SceneSeed[]): {
  scenes: Scene[];
  versions: SceneVersion[];
} {
  const scenes: Scene[] = [];
  const versions: SceneVersion[] = [];

  for (const seed of seeds) {
    const versionId = `${seed.id}-v${seed.version.version_no ?? 1}`;
    scenes.push({
      id: seed.id,
      project_id: PROJECT.id,
      branch_id: seed.branch_id,
      order_index: seed.order_index,
      title: seed.title,
      current_version_id: versionId,
      forked_from_scene_id: seed.forked_from_scene_id ?? null,
    });
    versions.push({
      ...seed.version,
      id: versionId,
      scene_id: seed.id,
      version_no: seed.version.version_no ?? 1,
    });
  }

  return { scenes, versions };
}

const WREN = "character-wren";
const STRANGER = "character-stranger";

const CANON_SEEDS: SceneSeed[] = [
  {
    id: "scene-main-s1",
    branch_id: CANON_BRANCH_ID,
    order_index: 0,
    title: "S1 — Arrival at the waterline",
    version: {
      panel_image_url: "/demo/main-s1.svg",
      setting: "Flooded city, upper terraces above the lower ward",
      time_of_day: "Late afternoon",
      characters_present: [WREN],
      dialogue: "WREN: Four hours of light. Three, if the tide is honest.",
      action:
        "Wren picks along a rooftop ridge and drops into waist-deep water at " +
        "the old terrace wall, paying out a rope behind.",
      emotional_beat: "Wary competence — this is routine, and routine is thin.",
      story_purpose:
        "Establish the drowned city, the tide deadline, and that Wren cannot swim.",
      props_used: ["rope"],
      author_id: CREATOR.id,
      created_at: "2026-07-24T11:00:00.000Z",
    },
  },
  {
    id: "scene-main-s2",
    branch_id: CANON_BRANCH_ID,
    order_index: 1,
    title: "S2 — The compass in the silt",
    version: {
      panel_image_url: "/demo/main-s2.svg",
      setting: "Flooded city, the counting-house floor",
      time_of_day: "Dusk",
      characters_present: [WREN],
      dialogue: "WREN: You're not pointing north at all, are you.",
      action:
        "Wren digs the brass compass out of the silt. The needle swings past " +
        "north and settles on the dark of the lower ward.",
      emotional_beat: "Held breath — the thing is real, and it is wrong.",
      story_purpose:
        "The inciting object. Establishes possession of the compass and its rule.",
      props_used: ["brass compass", "rope"],
      author_id: CREATOR.id,
      created_at: "2026-07-24T11:20:00.000Z",
    },
  },
  {
    id: "scene-main-s3",
    branch_id: CANON_BRANCH_ID,
    order_index: 2,
    title: "S3 — The choice at the drowned stair",
    version: {
      panel_image_url: "/demo/main-s3.svg",
      setting: "Flooded city, the drowned stair",
      time_of_day: "Dusk",
      characters_present: [WREN, STRANGER],
      dialogue:
        "STRANGER (off-panel): Please — I can't get free.\n" +
        "WREN: ...The tide doesn't wait for either of us.",
      action:
        "A cry comes from under the drowned stair. Wren closes a hand around " +
        "the compass, turns away, and follows the needle deeper.",
      emotional_beat: "Guilt swallowed whole.",
      story_purpose:
        "The decision point. Canon: Wren keeps the compass and walks on.",
      props_used: ["brass compass", "rope"],
      author_id: CREATOR.id,
      created_at: "2026-07-24T11:45:00.000Z",
    },
  },
  {
    id: "scene-main-s4",
    branch_id: CANON_BRANCH_ID,
    order_index: 3,
    title: "S4 — The way out",
    version: {
      panel_image_url: "/demo/main-s4.svg",
      setting: "Flooded city, the lower ward channel",
      time_of_day: "Night",
      characters_present: [WREN],
      dialogue: "WREN: Show me what I've lost, then. Go on.",
      action:
        "Wren holds the compass up to the last light. The needle turns back " +
        "the way they came, toward the drowned stair.",
      emotional_beat: "The cost lands.",
      story_purpose: "Pay off the compass rule against the choice made in S3.",
      props_used: ["brass compass", "rope"],
      author_id: CREATOR.id,
      created_at: "2026-07-24T12:10:00.000Z",
    },
  },
];

/**
 * The what-if timeline. Branching copies the scene rows (plan §4, decision 1),
 * so S1 and S2 exist here as their own rows pointing back at canon through
 * forked_from_scene_id. S1/S2 are untouched copies; S3 and S4 are the
 * collaborator's rewrite; S5 is new.
 */
const WHATIF_SEEDS: SceneSeed[] = [
  {
    id: "scene-wf-s1",
    branch_id: WHATIF_BRANCH_ID,
    order_index: 0,
    title: "S1 — Arrival at the waterline",
    forked_from_scene_id: "scene-main-s1",
    version: {
      ...CANON_SEEDS[0].version,
      created_at: "2026-07-27T14:12:00.000Z",
    },
  },
  {
    id: "scene-wf-s2",
    branch_id: WHATIF_BRANCH_ID,
    order_index: 1,
    title: "S2 — The compass in the silt",
    forked_from_scene_id: "scene-main-s2",
    version: {
      ...CANON_SEEDS[1].version,
      created_at: "2026-07-27T14:12:00.000Z",
    },
  },
  {
    id: "scene-wf-s3",
    branch_id: WHATIF_BRANCH_ID,
    order_index: 2,
    title: "S3 — Wren turns back",
    forked_from_scene_id: "scene-main-s3",
    version: {
      // v2: the collaborator edited the copied scene, so this is the second
      // version of this row. The diff view compares v1 (the copy) to v2.
      version_no: 2,
      panel_image_url: "/demo/wf-s3.svg",
      setting: "Flooded city, the drowned stair",
      time_of_day: "Dusk",
      characters_present: [WREN, STRANGER],
      dialogue:
        "STRANGER: Please — I can't get free.\n" +
        "WREN: Hold this. Both hands. It'll pull you toward the water — go the other way.",
      action:
        "Wren presses the brass compass into the stranger's hands, loops the " +
        "rope under their arms, and hauls until the stair gives them up.",
      emotional_beat: "A choice made before it can be argued with.",
      story_purpose:
        "The divergence. Wren saves the stranger AND GIVES THE COMPASS AWAY.",
      // No compass — it changed hands in this very scene.
      props_used: ["rope", "lantern"],
      author_id: COLLABORATOR.id,
      created_at: "2026-07-27T14:31:00.000Z",
    },
  },
  {
    id: "scene-wf-s4",
    branch_id: WHATIF_BRANCH_ID,
    order_index: 3,
    title: "S4 — Reading the compass in the dark",
    forked_from_scene_id: "scene-main-s4",
    version: {
      version_no: 2,
      panel_image_url: "/demo/wf-s4.svg",
      setting: "Flooded city, the lower ward channel",
      time_of_day: "Night",
      characters_present: [WREN],
      dialogue: "WREN: Show me the way out. Just this once, be a compass.",
      action:
        "Wren lifts the brass compass to catch the last light and follows the " +
        "needle out of the channel.",
      emotional_beat: "Exhausted relief.",
      story_purpose: "Get Wren out of the ward alive.",
      // THE CONTRADICTION. The compass was given away in S3 and is still here.
      // Leave it. This is the fifteen seconds the demo is built around.
      props_used: ["brass compass", "rope"],
      author_id: COLLABORATOR.id,
      created_at: "2026-07-27T14:48:00.000Z",
    },
  },
  {
    id: "scene-wf-s5",
    branch_id: WHATIF_BRANCH_ID,
    order_index: 4,
    title: "S5 — The stranger's debt",
    version: {
      panel_image_url: "/demo/wf-s5.svg",
      setting: "Upper terraces, the ridge above the waterline",
      time_of_day: "Night",
      characters_present: [WREN, STRANGER],
      dialogue: "STRANGER: You'll want this back.\nWREN: Keep it. It only points at what you've lost.",
      action:
        "The stranger climbs out after Wren and holds out the compass. Wren " +
        "does not take it.",
      emotional_beat: "A debt neither of them names.",
      story_purpose:
        "New ending for the alternate timeline; sets up a second arc.",
      props_used: ["brass compass"],
      author_id: COLLABORATOR.id,
      created_at: "2026-07-27T15:02:00.000Z",
    },
  },
];

const canon = split(CANON_SEEDS);
const whatIf = split(WHATIF_SEEDS);

export const SCENES: Scene[] = [...canon.scenes, ...whatIf.scenes];
export const SCENE_VERSIONS: SceneVersion[] = [
  ...canon.versions,
  ...whatIf.versions,
];

/** The join every UI surface actually wants. */
export const SCENES_WITH_VERSIONS: SceneWithVersion[] = SCENES.map((scene) => {
  const version = SCENE_VERSIONS.find((v) => v.id === scene.current_version_id);
  if (!version) {
    throw new Error(
      `fixtures: scene ${scene.id} points at missing version ${scene.current_version_id}`,
    );
  }
  return { ...scene, version };
});

/* -------------------------------------------------------------------------- */
/* World facts — the canon bible                                               */
/* -------------------------------------------------------------------------- */

export const WORLD_FACTS: WorldFact[] = [
  {
    id: "fact-compass-possession",
    project_id: PROJECT.id,
    branch_id: null,
    kind: "prop",
    subject: "brass compass",
    statement: "The brass compass is in Wren's possession.",
    established_in_scene_id: "scene-main-s2",
    status: "canon",
  },
  {
    id: "fact-compass-rule",
    project_id: PROJECT.id,
    branch_id: null,
    kind: "prop",
    subject: "brass compass",
    statement:
      "The compass does not point north. It points toward what the holder has lost.",
    established_in_scene_id: "scene-main-s2",
    status: "canon",
  },
  {
    id: "fact-ward-floods",
    project_id: PROJECT.id,
    branch_id: null,
    kind: "location",
    subject: "the lower ward",
    statement: "The lower ward floods completely within hours of dusk.",
    established_in_scene_id: "scene-main-s1",
    status: "canon",
  },
  {
    id: "fact-wren-cannot-swim",
    project_id: PROJECT.id,
    branch_id: null,
    kind: "character",
    subject: "Wren",
    statement: "Wren cannot swim and never enters water above the chest.",
    established_in_scene_id: "scene-main-s1",
    status: "canon",
  },
  {
    id: "fact-stranger-trapped",
    project_id: PROJECT.id,
    branch_id: null,
    kind: "event",
    subject: "the stranger",
    statement: "Someone is trapped beneath the drowned stair as the tide rises.",
    established_in_scene_id: "scene-main-s3",
    status: "canon",
  },
  // Branch-local facts. These are true ONLY on the what-if timeline, which is
  // exactly why CanonContext keeps the two lists apart.
  {
    id: "fact-compass-given-away",
    project_id: PROJECT.id,
    branch_id: WHATIF_BRANCH_ID,
    kind: "prop",
    subject: "brass compass",
    statement:
      "Wren gave the brass compass to the stranger at the drowned stair.",
    established_in_scene_id: "scene-wf-s3",
    status: "branch",
  },
  {
    id: "fact-stranger-rescued",
    project_id: PROJECT.id,
    branch_id: WHATIF_BRANCH_ID,
    kind: "event",
    subject: "the stranger",
    statement: "The stranger was pulled free of the drowned stair and survives.",
    established_in_scene_id: "scene-wf-s3",
    status: "branch",
  },
];

/* -------------------------------------------------------------------------- */
/* The expected finding                                                        */
/* -------------------------------------------------------------------------- */

/**
 * What the continuity inspector must produce for the what-if timeline.
 *
 * THIS IS THE ORACLE, NOT THE SOURCE. The workspace does not render it — the
 * rule engine (src/lib/ai/rules.ts) computes findings from the scene data on
 * every load, and this constant is what that computation is checked against.
 * It also seeds the ai_reviews row so the persisted-review path has realistic
 * data before step P5.
 *
 * If the engine and this constant disagree, one of them has a bug. Find out
 * which before changing either.
 */
export const EXPECTED_FINDING: ContinuityFinding = {
  id: "finding-compass-possession",
  severity: "high",
  kind: "prop_state",
  affected_scene_id: "scene-wf-s4",
  evidence: [
    {
      scene_id: "scene-wf-s3",
      quote_or_field:
        "Wren presses the brass compass into the stranger's hands — props_used: [rope, lantern]",
    },
    {
      scene_id: "scene-wf-s4",
      quote_or_field: "props_used: [brass compass, rope]",
    },
  ],
  broken_fact: {
    subject: "brass compass",
    statement: "The brass compass is in Wren's possession.",
    established_in_scene_id: "scene-main-s2",
  },
  explanation:
    "S3 of this timeline transfers the brass compass to the stranger, which " +
    "ends Wren's possession of it. S4 then has Wren lift the compass to read " +
    "it. The prop cannot be in both hands, so one of the two scenes has to give.",
  suggested_fix:
    "Either have the stranger return the compass before Wren leaves the " +
    "channel, or rewrite S4 so Wren navigates by the lantern and the current " +
    "instead — which also strengthens the cost of the choice made in S3.",
  source: "rule+model",
};

export const AI_REVIEW: AiReview = {
  id: "review-what-if-1",
  project_id: PROJECT.id,
  branch_id: WHATIF_BRANCH_ID,
  kind: "continuity",
  status: "complete",
  findings: [EXPECTED_FINDING],
  model: "ibm/granite-3-8b-instruct",
  created_at: "2026-07-27T15:10:00.000Z",
};

/* -------------------------------------------------------------------------- */
/* Activity                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * `summary` never names the actor — the feed renders `{actor} {summary}` and
 * a name baked into the string would show up twice.
 */
export const ACTIVITY_EVENTS: ActivityEvent[] = [
  {
    id: "activity-1",
    project_id: PROJECT.id,
    branch_id: CANON_BRANCH_ID,
    actor_id: CREATOR.id,
    kind: "character_locked",
    subject_id: "character-wren",
    summary: "locked Wren to reference sheet v2",
    created_at: "2026-07-25T16:06:00.000Z",
  },
  {
    id: "activity-2",
    project_id: PROJECT.id,
    branch_id: WHATIF_BRANCH_ID,
    actor_id: COLLABORATOR.id,
    kind: "branch_created",
    subject_id: WHATIF_BRANCH_ID,
    summary: "opened the timeline what-if/save-the-stranger from S2",
    created_at: "2026-07-27T14:12:00.000Z",
  },
  {
    id: "activity-3",
    project_id: PROJECT.id,
    branch_id: WHATIF_BRANCH_ID,
    actor_id: COLLABORATOR.id,
    kind: "scene_updated",
    subject_id: "scene-wf-s3",
    summary: "rewrote S3 — Wren turns back",
    created_at: "2026-07-27T14:31:00.000Z",
  },
  {
    id: "activity-4",
    project_id: PROJECT.id,
    branch_id: WHATIF_BRANCH_ID,
    actor_id: COLLABORATOR.id,
    kind: "scene_updated",
    subject_id: "scene-wf-s4",
    summary: "rewrote S4 — Reading the compass in the dark",
    created_at: "2026-07-27T14:48:00.000Z",
  },
  {
    id: "activity-5",
    project_id: PROJECT.id,
    branch_id: WHATIF_BRANCH_ID,
    actor_id: COLLABORATOR.id,
    kind: "scene_created",
    subject_id: "scene-wf-s5",
    summary: "added S5 — The stranger's debt",
    created_at: "2026-07-27T15:02:00.000Z",
  },
  {
    id: "activity-6",
    project_id: PROJECT.id,
    branch_id: WHATIF_BRANCH_ID,
    actor_id: CREATOR.id,
    kind: "review_run",
    subject_id: AI_REVIEW.id,
    summary: "ran a canon review — 1 contradiction on what-if/save-the-stranger",
    created_at: "2026-07-27T15:10:00.000Z",
  },
];

/* -------------------------------------------------------------------------- */
/* The bundle                                                                  */
/* -------------------------------------------------------------------------- */

export const fixtures = {
  profiles: PROFILES,
  project: PROJECT,
  members: MEMBERS,
  branches: BRANCHES,
  characters: CHARACTERS,
  characterVersions: CHARACTER_VERSIONS,
  scenes: SCENES,
  sceneVersions: SCENE_VERSIONS,
  scenesWithVersions: SCENES_WITH_VERSIONS,
  worldFacts: WORLD_FACTS,
  activityEvents: ACTIVITY_EVENTS,
  aiReviews: [AI_REVIEW],
} as const;
