# AI Architecture — Storyverse

_Last updated: 2026-07-25_

## Overview

Storyverse uses IBM Granite (`ibm/granite-3-3-8b-instruct`) as its AI backbone,
accessed through the IBM watsonx.ai REST API.  All AI calls are server-side
Next.js route handlers — no credentials or raw model output ever reach the browser.

Three dedicated endpoints power the AI features:

| Route | Feature | Human approval required? |
|---|---|---|
| `POST /api/ai/continuity` | Continuity inspector | Yes — every finding must be reviewed |
| `POST /api/ai/merge-assistant` | Merge strategies preview | Yes — human selects and confirms merge |
| `POST /api/ai/character-refine` | Character update proposal | Yes — explicit approval before writing |

A fourth module (`src/lib/ai/panelRequest.ts`) prepares panel-generation requests
and exposes a deterministic fallback for demo and test use.

---

## Model

| Property | Value |
|---|---|
| Model ID | `ibm/granite-3-3-8b-instruct` |
| Provider | IBM watsonx.ai |
| API endpoint | `{WATSONX_URL}/ml/v1/text/generation?version=2023-05-29` |
| Temperature | `0` (deterministic output) |
| Max new tokens | `1024` |
| Timeout | `AI_REQUEST_TIMEOUT_MS` (default `15000` ms) |

The model ID used in production is `ibm/granite-3-3-8b-instruct`.  
The default in [`src/lib/ai/provider.ts`](../src/lib/ai/provider.ts) is currently
`ibm/granite-13b-instruct-v2` — update `DEFAULT_MODEL_ID` before a production
deployment if you want to pin the newer Granite 3.3 model explicitly.

---

## What data is sent

Every AI call receives a `CanonContext` object (defined in
[`src/lib/ai/schemas.ts`](../src/lib/ai/schemas.ts)):

```ts
{
  projectId: string;          // Project identifier
  branchName: string;         // Branch being evaluated
  canonFacts: CanonFact[];    // Locked, immutable world-state facts
  branchFacts: CanonFact[];   // Branch-specific overrides (potential contradictions)
  sceneHistory: string[];     // Ordered list of scene titles
  characterSummary: string;   // Locked character description
}
```

A `CanonFact` is:

```ts
{ key: string; value: string; lockedInScene: number }
```

**What is NOT sent:**

- User identities, email addresses, or account data
- Full scene scripts or raw dialogue beyond the locked summary
- Any information not needed for the specific AI task
- API keys or credentials (those stay in the server environment)

---

## Endpoint details

### `POST /api/ai/continuity`

**Purpose:** Detect continuity errors between branch facts and canon facts.

**Input:** `CanonContext`

**Output:** `ContinuityReviewResponse`
```ts
{
  branchName: string;
  reviewedAt: string;           // ISO 8601
  findings: ContinuityFinding[];
  summary: string;
  requiresHumanReview: boolean; // true when any finding is critical or major
}
```

**Human approval:** Required for every finding. No scene is auto-locked.

---

### `POST /api/ai/merge-assistant`

**Purpose:** Analyse a branch against canon and propose 2–3 merge strategies.

**Input:** `CanonContext`

**Output:** `MergeAssistantResponse`
```ts
{
  branchName: string;
  branchSummary: string;
  compatibleChanges: string[];
  trueConflicts: string[];
  strategies: MergeStrategy[];  // 2–3 items
  previewOnly: true;            // z.literal(true) — AI never executes a merge
}
```

**Human approval:** The author must select a strategy and confirm the merge.  
`previewOnly: z.literal(true)` is enforced at the Zod schema level — any response
that sets this to `false` is rejected with HTTP 502 before it reaches the caller.

---

### `POST /api/ai/character-refine`

**Purpose:** Propose an updated character description that reflects canon changes.

**Input:** `CanonContext & { characterId: string }`

**Output:** `CharacterRefinementResponse`
```ts
{
  characterId: string;
  proposedDescription: string;
  proposedGenerationInstruction: string;  // For the image pipeline
  changeRationale: string;
  requiresApproval: true;                 // z.literal(true) — never auto-applied
}
```

**Human approval:** The character record is never written by this endpoint.
The caller must explicitly approve and persist the update.  
`requiresApproval: z.literal(true)` is enforced at the Zod schema level.

---

## Panel generation fallback

[`src/lib/ai/panelRequest.ts`](../src/lib/ai/panelRequest.ts) builds a
`PanelGenerationRequest` for the image pipeline:

```ts
{
  projectId: string;
  sceneId: string;
  lockedCharacterDescription: string;
  canonFacts: CanonFact[];
  sceneDescription: string;
  styleInstruction: string;
  useFallback: boolean;        // true → return prepared asset, skip model
}
```

`getPanelFallback()` returns a deterministic result:

```ts
{
  assetUrl: string;                   // Path to the prepared demo image
  request: PanelGenerationRequest;   // Full request that would have been sent
}
```

This lets the demo UI show both the prepared image _and_ the exact prompt/context
that would have been sent to a real image model, without making any external call.

---

## Mock mode

Set `AI_MOCK=true` in your environment (already the default in `.env.example`) to
run the entire app and all tests without any IBM or Supabase credentials.

In mock mode, `callWatsonx()` throws `WatsonxCredentialError`, and each route
handler catches it and substitutes the corresponding deterministic mock from
[`src/lib/ai/mocks.ts`](../src/lib/ai/mocks.ts).

The mocks reflect the "flooded city / compass contradiction" demo scenario
and pass all Zod schemas.

---

## Error handling

| Error class | HTTP status | Cause |
|---|---|---|
| `WatsonxCredentialError` | — (caught, falls back to mock) | `AI_MOCK=true` or missing env vars |
| `WatsonxTimeoutError` | 408 | Request exceeded `AI_REQUEST_TIMEOUT_MS` |
| `WatsonxRateLimitError` | 429 | Watsonx API returned HTTP 429 |
| `WatsonxMalformedResponseError` | 502 | Non-JSON or schema-invalid model output |
| Zod `safeParse` failure on request | 400 | Invalid request body from caller |
| Zod `safeParse` failure on response | 502 | Model output failed schema validation |

All error classes are in [`src/lib/ai/errors.ts`](../src/lib/ai/errors.ts).

---

## Responsible AI

All AI responses are proposals — no AI call has write access to the database
or canon timeline. Every feature requires explicit human action to apply a result.

UI disclaimer text for every AI feature is in
[`src/lib/ai/responsibleAI.ts`](../src/lib/ai/responsibleAI.ts).

IBM AI ethics principles: <https://www.ibm.com/impact/ai-ethics>

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `WATSONX_API_KEY` | When `AI_MOCK=false` | IBM Cloud IAM API key |
| `WATSONX_PROJECT_ID` | When `AI_MOCK=false` | watsonx.ai project ID |
| `WATSONX_URL` | When `AI_MOCK=false` | watsonx.ai base URL, e.g. `https://us-south.ml.cloud.ibm.com` |
| `AI_MOCK` | Always | Set `true` for local dev and CI without real credentials |
| `AI_REQUEST_TIMEOUT_MS` | Optional | Default `15000`. Lower for tests. |

---

## File map

```
src/lib/ai/
  schemas.ts              — All Zod schemas and inferred TypeScript types
  provider.ts             — callWatsonx() — single Watsonx entry-point
  mocks.ts                — Deterministic mock responses (compass scenario)
  errors.ts               — Typed error classes (Timeout, RateLimit, etc.)
  contextBuilder.ts       — buildCanonContext() — assembles CanonContext from branches
  panelRequest.ts         — buildPanelRequest() + getPanelFallback()
  responsibleAI.ts        — Disclaimer constants rendered by the UI
  mergeAssistantClient.ts — Typed client helper for Firdosi's UI
  prompts/
    continuityPrompt.ts       — Prompt builder for continuity review
    mergeAssistantPrompt.ts   — Prompt builder for merge assistant
    characterRefinePrompt.ts  — Prompt builder for character refinement
  __tests__/
    panelRequest.test.ts  — Unit tests for panelRequest.ts

src/app/api/ai/
  continuity/
    route.ts              — POST /api/ai/continuity
    route.test.ts         — Integration tests
  merge-assistant/
    route.ts              — POST /api/ai/merge-assistant
    route.test.ts         — Integration tests
  character-refine/
    route.ts              — POST /api/ai/character-refine
    route.test.ts         — Integration tests
```
