# AI architecture

Storyverse separates deterministic story analysis from optional language-model assistance.

## Providers

`src/lib/ai/provider.ts` exposes one `callModel()` entry point:

- `AI_PROVIDER=mock` is the default. Routes use typed deterministic responses and make no network call.
- `AI_PROVIDER=ollama` calls a local Ollama-compatible `/api/generate` endpoint.

The Ollama request uses JSON output mode, temperature `0`, a configurable timeout, and no API key. Provider responses are parsed once at the adapter boundary, then validated against feature-specific Zod schemas in each route.

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `AI_PROVIDER` | `mock` | Selects `mock` or `ollama`. |
| `AI_MODEL` | `llama3.2:3b` | Local Ollama model name. |
| `AI_BASE_URL` | `http://127.0.0.1:11434` | Local Ollama server. |
| `AI_REQUEST_TIMEOUT_MS` | `15000` | Aborts a slow model request. |

## Request context

AI features receive the smallest useful `CanonContext`: project and branch identifiers, locked canon facts, branch facts, scene titles, and a character summary. User credentials and unrelated account data are not included.

## Endpoints

- `POST /api/ai/continuity` explains continuity findings and proposes fixes.
- `POST /api/ai/merge-assistant` proposes preview-only merge strategies.
- `POST /api/ai/character-refine` proposes a character update that requires approval.
- `POST /api/ai/panel-generate` assembles a validated image request and returns a prepared local asset.

Every response is schema-validated. Invalid model output returns HTTP 502. Timeouts return 408, rate limits return 429, and an unavailable local provider falls back to the deterministic result.

## Human control

The AI routes produce advice and previews only. They do not write to canon. Merge strategies set `previewOnly: true`, character proposals set `requiresApproval: true`, and reviewers must explicitly accept or dismiss continuity findings.
