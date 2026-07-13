# CLAUDE.md

Project context for Claude Code / Claude when working in this repository.

## What this repo is

A hackathon project for the **IBM watsonx Challenge**. The goal is to build a
working demo that solves a real-world problem using IBM's watsonx stack
(watsonx.ai, watsonx Orchestrate, Granite models) and clearly documents how each
watsonx product is used — that documentation is a graded submission requirement.

Full background lives in `research/watsonx-challenge-research.md`. Read it before
making architecture decisions.

## Priorities (in order)

1. **A working end-to-end demo.** Judges reward functional hacks over slides.
   Get something running early, then iterate.
2. **Clear watsonx usage.** For every feature, note which watsonx product/skill
   it uses. Keep this current for the submission write-up.
3. **Challenge fit.** Stay tied to a concrete real-world problem and user.
4. **Polish and pitch** last.

## Tech stack

- **watsonx.ai** — foundation-model inference (Granite models).
- **watsonx Orchestrate** — agentic workflows (ADK + local Developer Edition).
- **RAG** — retrieval over a focused document set for grounding.
- App framework / language: TBD — update this section once chosen.

## Conventions

- **Never commit secrets.** API keys and IBM Cloud credentials go in a
  git-ignored `.env`. Reference them via environment variables.
- Keep the README's "Tech stack" and "The idea" sections in sync with reality.
- Prefer small, working increments over large unfinished features (hackathon
  time budget).
- When adding a component, jot down its watsonx usage so the submission write-up
  stays accurate.

## Useful references

- watsonx.ai: https://www.ibm.com/products/watsonx-ai
- watsonx Orchestrate ADK / Developer Edition: https://developer.ibm.com/
- IBM watsonx hackathons: https://developer.ibm.com/hackathons/

## Custom agent

A specialized subagent for this project lives at
`.claude/agents/watsonx-hackathon-assistant.md`. Use it for watsonx-specific
build help, RAG/agent design, and submission-prep tasks.
