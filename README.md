# Storyverse

Storyverse is a collaborative visual-storytelling platform where small comic and animation
teams branch, review, and merge story ideas while AI protects continuity and visual
consistency.

This project targets the July 2026 **Reimagine Creative Industries with AI** theme of the IBM
AI Builders Challenge with IBM Bob.

## Current status

The workspace runs end to end against the demo story. Open
`/p/project-drowned-compass` and you get the Obsidian-style shell — mode rail, story
explorer, tabbed centre pane, canon panel, status bar, and a Ctrl/Cmd+K palette —
rendering "The Drowned Compass": two timelines, a locked character reference, and the
planted continuity contradiction.

Landed:

- **The shared contract** (`src/lib/types/schemas.ts`) — Zod schemas for all eleven MVP
  entities plus the AI request/response shapes. Every type in the app is inferred from it.
- **The demo fixtures** (`src/lib/demo/fixtures.ts`) — the whole story as typed data,
  parsed against the contract in CI.
- **The data seam** (`src/lib/db/queries.ts`) — the only module that reads data. It
  returns fixtures today and Supabase later, behind `NEXT_PUBLIC_USE_FIXTURES`, so no
  component changes when the database lands.
- **The workspace shell**, driven entirely by that data: timeline switching, scene
  selection, flagged scenes, canon facts in play, and the revision trail.
- **Revision-safe branch editing** - collaborators can edit alternate-timeline scenes,
  while an atomic Supabase function snapshots the previous content, rejects stale edits,
  and prevents direct canon changes.

Next: Supabase schema and auth, the branch tree, the visual diff, the two-stage continuity
inspector against watsonx, and human-approved selective merge.

## How the demo works

The story is "The Drowned Compass". Wren finds a brass compass in a flooded city and, at
the drowned stair, chooses between the compass and a trapped stranger.

- **Canon (`main`)** — Wren keeps the compass and walks on.
- **What-if (`what-if/save-the-stranger`)** — a collaborator rewrites S3 so Wren gives the
  compass away to save the stranger.
- **The contradiction** — the collaborator's S4 still lists `brass compass` in
  `props_used`. The prop cannot be in two pairs of hands.

That contradiction is detectable from **structured fields**, not from prose, which is what
lets a deterministic rule engine find it and a language model explain it. The split is
deliberate: state tracking across scenes is what rules are good at, and narrative
explanation is what the model is good at. It also degrades gracefully — with watsonx
unavailable the finding still appears, labelled `source: rule`.

## Stack

- Next.js App Router, React, and TypeScript
- Tailwind CSS and shadcn/ui-compatible configuration
- React Flow for visual story branches
- Three.js, React Three Fiber, and Drei for the cinematic branch-tree layer
- Framer Motion for interface transitions
- Zustand for local client state
- Supabase for authentication, PostgreSQL, storage, and realtime events
- Zod and React Hook Form for validated forms
- Vitest and React Testing Library for component tests

## Getting started

Requirements: Node.js 20.9 or newer and npm 10 or newer.

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Environment variables are documented in `.env.example`. The landing page runs without
credentials; Supabase and watsonx-backed features will require their corresponding values.
For a live Supabase project, apply the repository migrations with `supabase db push`
before starting the app.

For live Supabase data, copy the project URL into `NEXT_PUBLIC_SUPABASE_URL` and the
dashboard field **Project Settings > API > Project API keys > anon public** into
`NEXT_PUBLIC_SUPABASE_ANON_KEY`. Do not use the `service_role` key in either public
variable; authorization remains enforced by Supabase Row Level Security.

## Commands

```bash
npm run dev        # Start local development
npm run build      # Create a production build
npm run lint       # Run ESLint
npm run typecheck  # Check TypeScript
npm test           # Run the test suite once

npm run scan:secrets            # Scan ALL git history for committed credentials
npm run scan:secrets -- --tree  # Scan only the current working tree (fast)
```

## Continuous integration

`.github/workflows/ci.yml` runs on every push and every pull request:

| Gate | Command | Why it is a gate |
| --- | --- | --- |
| Install | `npm ci` | Proves a clean clone installs — a judge's first experience |
| Lint | `npm run lint` | Currently zero warnings; keeps it that way |
| Typecheck | `npm run typecheck` | Has silently broken three times; this stops a fourth |
| Test | `npm test` | Includes the barrel-file guard and the secret-scanner tests |
| Secret scan | `npm run scan:secrets` | Full history, so checkout uses `fetch-depth: 0` |
| Build | `npm run build` | Runs with `AI_MOCK=true` — must succeed with no credentials |

Steps run cheapest-first, and each runs even if an earlier one failed, so one
push surfaces every problem instead of one per fix.

**CI uses `npm ci`, not `npm install`.** It fails outright when
`package-lock.json` drifts from `package.json` — which is exactly the breakage
someone hits cloning the repo fresh. If a dependency change is rejected there,
run `npm install` and commit the updated lockfile.

## Secrets

No credential belongs in this repository. `.gitignore` excludes every `.env*`
file except `.env.example`, which holds names with empty values only.

`npm run scan:secrets` checks the **entire git history**, not just the working
tree. That distinction matters: a key that was committed and later deleted is
still in the history, still fetchable by anyone who clones the repo, and still
disqualifying. Deleting the file does not undo the leak.

Run it before making the repository public and before submitting. It exits
non-zero when it finds something, so it also works as a CI gate.

**If it ever reports a real credential**, the order matters:

1. **Revoke the key at the provider first.** Assume it is compromised — once
   pushed, it may already be indexed. Rewriting history does not un-publish it.
2. Then purge it from history (`git filter-repo`) and force-push.
3. Only then fix the code that referenced it.

The scanner is a safety net, not a proof: it catches the credential shapes this
project uses plus common vendor formats. `src/test/scan-secrets.test.ts` proves
it fires on real shapes and stays quiet on this repo's placeholders.

## Troubleshooting

### `index.ts` files keep reappearing and breaking `npm run typecheck`

An IDE extension in this project auto-generates barrel `index.ts` files that
re-export everything in their directory. They have broken the typecheck three
separate times: they re-export API route handlers (producing duplicate `GET` /
`POST` exports), they reference directories that contain no module, and they
collide on names exported by two different files.

**Nothing in this codebase imports from a barrel** — every import uses a direct
path — so these files have no upside here.

`src/test/no-barrel-files.test.ts` fails the suite whenever one reappears, so
they cannot land silently. That test is a backstop, not a fix. The actual fix is
to turn the generator off in your editor:

- VS Code: find the extension that offers "generate index file" / "auto barrel"
  behaviour and disable it **for this workspace**.
- If you cannot identify it, disable extensions one at a time with
  `Developer: Reload Window` between each, and re-run
  `npx vitest run src/test/no-barrel-files.test.ts` to see when it stops.

If a barrel is ever genuinely wanted, add its path to the `ALLOWED` set in that
test with a comment explaining why.

## Project structure

```text
src/
  app/
    (marketing)/       Signed-out landing page
    (app)/p/[projectId]/  The workspace. Its layout fetches the data snapshot.
    design/            Component gallery, rendered from the real fixtures
  components/
    shell/             Rail, sidebars, pane tabs, status bar, command palette
    story/             SceneCard, SceneCanvas, field diff, state chips
    review/            FindingCard
    ui/                shadcn primitives, themed to the Storyverse tokens
  lib/
    types/schemas.ts   THE CONTRACT — Zod schemas, all types inferred from here
    demo/fixtures.ts   The demo story as typed data
    db/queries.ts      The only module that reads data
    store/             workspace.ts (UI state) + workspace-data.tsx (domain snapshot)
    supabase/          Browser and server Supabase clients
  test/                Shared test setup
public/demo/           Placeholder panel and reference-sheet art
```

### The one architectural rule

Nothing outside `src/lib/db/` reads data. The project layout fetches one snapshot on the
server and passes it down; no client component fetches anything. That is what makes
`NEXT_PUBLIC_USE_FIXTURES` a one-line switch instead of a refactor, and it is also why
there is no client-side path a key could leak into.

## Responsible AI and human control

Storyverse treats AI output as a proposal. Continuity findings, generated assets, branch
suggestions, and merge strategies must remain explainable, reviewable, reversible, and subject
to creator approval. Original visual styles are preferred over imitation of named living artists.

### Panel preview limitation

Panel images are not generated live in this prototype. The panel flow returns a prepared demo
asset so the judge path remains fast, deterministic, and usable without an image-model account.
Alongside that asset, the interface displays the complete request that a future image pipeline
would receive: the locked character description, canon facts, scene description, style
instruction, project and scene identifiers, and fallback flag. A creator must still review and
approve the result before it can become part of the story.

## Built with IBM Bob

IBM Bob is the primary development tool for this challenge entry. The team will record Bob's
contributions to architecture, implementation, testing, debugging, accessibility review, and
documentation, along with the human decisions and validation applied to its output.

## Near-term build path

1. ~~Build the story workspace and scene-card model.~~ Done.
2. ~~Define the shared contract and the demo data.~~ Done.
3. Add Supabase schema, RLS, authentication, and the staged seed script.
4. Implement the 2D branch tree over the existing timeline data.
5. Add the continuity review and visual diff flow against watsonx.
6. Add the optional Three.js overview after the 2D workflow is reliable.
