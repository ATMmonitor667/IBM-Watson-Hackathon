# Storyverse

Storyverse is a collaborative visual-storytelling platform where small comic and animation
teams branch, review, and merge story ideas while AI protects continuity and visual
consistency.

This project targets the July 2026 **Reimagine Creative Industries with AI** theme of the IBM
AI Builders Challenge with IBM Bob.

## Current status

The MVP workspace runs end to end against the demo story. Open
`/projects/demo-1` to use the single canonical project experience. Its mode switcher keeps
the complete creator workflow in one place:

- **Story workspace** — create scenes and branches, edit alternate-timeline scenes, inspect
  revisions, generate panel previews, review continuity flags, and selectively merge
  creator-approved scenes into canon.
- **Character Studio** — define and refine the reusable character references that protect
  visual consistency.
- **Canon Review** — compare an alternate branch with canon, inspect deterministic and
  AI-assisted findings, and keep the final decision with the creator.

The landing page, sign-in flow, sidebar, and legacy `/p/[projectId]` bookmarks all converge
on that route. The former standalone character and review URLs also redirect into the same
workspace instead of exposing competing shells or dead-end navigation.

The demo works without credentials. Configured projects load through Supabase; the demo
fixtures provide a deterministic judge path. The next production-hardening work is real
authentication, persistent character/review data, the live watsonx model path, and a
transactional server-side selective merge.

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

The repository prevents recurrence at three layers:

1. `.vscode/settings.json` disables Auto Barrel and tells the other common
   auto-barrel generator to skip `src/`. `.vscode/extensions.json` marks both
   known generators as unwanted for this workspace.
2. `npm run check:barrels` rejects every `index.ts` or `index.tsx` below `src/`.
3. `npm run typecheck` runs that guard before TypeScript, and CI runs both the
   typecheck and regression tests on every branch and pull request.

Do not install or enable a barrel generator for this workspace. If an editor
ignores the repository settings, disable its barrel/index generation extension
for this workspace. Run `npm run check:barrels` to identify every generated
file that must be removed.

Storyverse intentionally has no barrel allowlist. If a real entry point becomes
necessary, give it a descriptive filename and keep imports explicit.

## Project structure

```text
src/
  app/
    (marketing)/       Signed-out landing page
    (workspace)/projects/[id]/  Canonical project workspace
    (app)/p/[projectId]/        Compatibility redirect for old bookmarks
    design/            Component gallery, rendered from the real fixtures
  components/
    workspace/         Branch tree, scene editing, project navigation, merge flow
    characters/        Character Studio and refinement workflow
    review/            Branch diff, continuity inspector, and Canon Review
    ui/                shadcn primitives, themed to the Storyverse tokens
  lib/
    projectStore.ts    Explicit deterministic demo data
    supabase/db.ts     Live project, branch, scene, and revision persistence
    stores/            Focused client interaction state
    workspaceRoutes.ts Canonical and compatibility workspace paths
  test/                Shared test setup
public/demo/           Placeholder panel and reference-sheet art
```

### The one architectural rule

All project entry points converge on `/projects/[id]`. The workspace uses explicit demo
fixtures only for `demo-1`; other project IDs load through the Supabase data helpers. Public
clients use only the anonymous Supabase key and rely on Row Level Security. Service-role
keys and provider secrets never belong in browser code.

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
3. ~~Add the Supabase schema, RLS, and persistence helpers.~~ Done.
4. ~~Implement the 2D branch tree, revision history, and selective merge workflow.~~ Done.
5. ~~Unify Story, Character Studio, and Canon Review under one project route.~~ Done.
6. Replace the sign-in prototype with a complete Supabase authentication flow.
7. Persist Character Studio and review decisions and make selective merge transactional.
8. Connect the reviewed continuity context to the live watsonx model path.
