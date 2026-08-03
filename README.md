# Storyverse

Storyverse is a collaborative visual-storytelling workspace for branching, reviewing, and merging story ideas while preserving character and world continuity.

The standalone application runs without cloud credentials. It ships with a complete demo project, deterministic AI previews, and optional integrations for a local Ollama model and Supabase persistence.

## What works

- Explore a visual story as canon and alternate timelines.
- Create and edit branch scenes without modifying locked canon directly.
- Compare branches and selectively merge reviewed changes.
- Detect structured continuity contradictions.
- Generate continuity explanations, merge proposals, and character refinements.
- Require explicit human approval before AI suggestions affect story data.
- Run entirely from bundled fixtures with no accounts or API keys.

## Quick start

Requirements: Node.js 20.9 or newer and npm 10 or newer.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), then open the bundled Drowned Compass project from the landing page.

The default configuration uses:

- `NEXT_PUBLIC_USE_FIXTURES=1` for bundled story data.
- `AI_PROVIDER=mock` for deterministic, offline AI responses.

No credentials, database, or model download are required for this mode.

## Optional local AI

Storyverse can use [Ollama](https://ollama.com/) without an API key:

```powershell
ollama pull llama3.2:3b
ollama serve
```

Then update `.env.local`:

```dotenv
AI_PROVIDER=ollama
AI_MODEL=llama3.2:3b
AI_BASE_URL=http://127.0.0.1:11434
```

Model output is schema-validated before it reaches the UI. If the local model is unavailable, Storyverse safely returns its deterministic preview instead.

## Optional persistence

The application uses fixtures by default. To persist projects in Supabase:

1. Create a Supabase project.
2. Apply the migrations in `supabase/migrations` and the optional `supabase/seed.sql`.
3. Set `NEXT_PUBLIC_USE_FIXTURES=0`.
4. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Supabase is optional and is not required to explore or develop the standalone demo.

## Architecture

```text
Next.js UI
  ├─ fixture data (default) or Supabase
  ├─ deterministic continuity rules
  └─ server-side AI routes
       ├─ mock provider (default, offline)
       └─ Ollama provider (optional, local)
```

The deterministic layer identifies contradictions from structured facts. The model layer explains findings and proposes changes. Routes enforce Zod response contracts, and all merge or character changes require explicit human review.

See `docs/ai-architecture.md` for the provider contract and endpoint details.

## Commands

```powershell
npm run dev
npm run build
npm run lint
npm run typecheck
npm test
npm run scan:secrets -- --tree
```

## Branch history

- `codex/standalone` contains the provider-neutral standalone application.
- `codex/ibm-hackathon-archive` preserves the final challenge-era repository at commit `acc37c2`.

The archive branch retains the original challenge brief, IBM-specific integration code, research, and submission planning.

## Security and privacy

- AI prompts contain project context, not authentication credentials.
- Local mock and Ollama modes keep model requests on the developer machine.
- Environment files remain ignored; `.env.example` contains names and safe defaults only.
- AI output is advisory and cannot directly mutate canon.
